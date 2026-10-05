import { Router, Response } from 'express';
import { collections, createDoc, deleteDoc, getDoc, listDocs, updateDoc } from '../db/firestore.ts';
import { AuthenticatedRequest, requireTenantPermission, resolveTenantId } from '../middleware/auth.ts';
import { Offering, Tenant, Subscriber } from '../db/models.ts';
import { logAuditAction } from '../lib/audit-logger.ts';
import { NewOffering, TenantType, tenantTypes, validateOfferingConfig } from '../lib/tenant-product.ts';

export const offeringsRouter = Router();

offeringsRouter.get('/', requireTenantPermission('offerings', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }
    const offerings = tenantId
      ? await listDocs<Offering>(collections.offerings, [['tenantId', '==', tenantId]])
      : await listDocs<Offering>(collections.offerings);
    offerings.sort((a, b) => a.name.localeCompare(b.name));
    return res.json(offerings);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch offerings', code: 'INTERNAL_ERROR', details: error.message });
  }
});

offeringsRouter.post('/', requireTenantPermission('offerings', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required', code: 'BAD_REQUEST' });
    const tenant = await getDoc<Tenant>(collections.tenants, tenantId);
    if (!tenant || (tenant.tenantType && !tenantTypes.includes(tenant.tenantType))) {
      return res.status(400).json({ error: 'Tenant type must be configured before creating offerings.', code: 'TENANT_TYPE_REQUIRED' });
    }

    const now = new Date().toISOString();
    const draft = {
      ...req.body,
      tenantId,
      active: req.body.active !== false,
      createdAt: now,
      updatedAt: now,
    } as NewOffering;
    const errors = validateOfferingConfig(draft);
    if (errors.length) return res.status(400).json({ error: 'Invalid offering configuration', details: errors, code: 'BAD_REQUEST' });

    const offering = await createDoc<Offering>(collections.offerings, draft);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'OFFERING_CREATED',
      tenantId,
      targetType: 'offering',
      targetId: String(offering.id),
      newState: { name: offering.name, kind: offering.kind, priceMinor: offering.priceMinor, currency: offering.currency },
      ipAddress: req.ip,
    });
    return res.status(201).json(offering);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create offering', code: 'INTERNAL_ERROR', details: error.message });
  }
});

offeringsRouter.patch('/:id', requireTenantPermission('offerings', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<Offering>(collections.offerings, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Offering not found', code: 'NOT_FOUND' });
    }

    const draft: Offering = { ...current, ...req.body, id: current.id, tenantId: current.tenantId, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    const errors = validateOfferingConfig(draft);
    if (errors.length) return res.status(400).json({ error: 'Invalid offering configuration', details: errors, code: 'BAD_REQUEST' });

    const { id: _id, tenantId: _tenantId, createdAt: _createdAt, ...updates } = draft;
    await updateDoc(collections.offerings, id, updates);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'OFFERING_UPDATED',
      tenantId: current.tenantId,
      targetType: 'offering',
      targetId: String(id),
      previousState: { name: current.name, kind: current.kind, priceMinor: current.priceMinor, currency: current.currency },
      newState: { name: draft.name, kind: draft.kind, priceMinor: draft.priceMinor, currency: draft.currency },
      ipAddress: req.ip,
    });
    return res.json(draft);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update offering', code: 'INTERNAL_ERROR', details: error.message });
  }
});

offeringsRouter.delete('/:id', requireTenantPermission('offerings', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<Offering>(collections.offerings, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Offering not found', code: 'NOT_FOUND' });
    }
    const assigned = await listDocs<Subscriber>(collections.subscribers, [['offeringId', '==', id]]);
    if (assigned.length) return res.status(409).json({ error: 'Offering is assigned to a customer; deactivate it instead.', code: 'OFFERING_IN_USE' });

    await deleteDoc(collections.offerings, id);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'OFFERING_DELETED',
      tenantId: current.tenantId,
      targetType: 'offering',
      targetId: String(id),
      previousState: { name: current.name, kind: current.kind, priceMinor: current.priceMinor, currency: current.currency },
      ipAddress: req.ip,
    });
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete offering', code: 'INTERNAL_ERROR', details: error.message });
  }
});