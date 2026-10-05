import { Router, Response } from 'express';
import { collections, createDoc, deleteDoc, getDoc, listDocs, updateDoc } from '../db/firestore.ts';
import { SubscriptionPlan, NewSubscriptionPlan } from '../db/models.ts';
import { AuthenticatedRequest, requireTenantPermission, resolveTenantId } from '../middleware/auth.ts';
import { logAuditAction } from '../lib/audit-logger.ts';

export const plansRouter = Router();

// GET /api/plans - List subscription plans (filtered strictly by tenant_id)
plansRouter.get('/', requireTenantPermission('plans', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    const plans = tenantId
      ? await listDocs<SubscriptionPlan>(collections.subscriptionPlans, [['tenantId', '==', tenantId]])
      : await listDocs<SubscriptionPlan>(collections.subscriptionPlans);
    plans.sort((a, b) => a.id - b.id);
    return res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch plans', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/plans - Create plan
plansRouter.post('/', requireTenantPermission('plans', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });

    const { name, duration_days = 30, price = '0.00' } = req.body;
    if (!name) return res.status(400).json({ error: 'Plan name is required', code: 'BAD_REQUEST' });

    const newPlan = await createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
      tenantId,
      name,
      durationDays: parseInt(duration_days, 10) || 30,
      price: String(price),
      createdAt: new Date().toISOString(),
    } as NewSubscriptionPlan);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'PLAN_CREATED',
      tenantId,
      targetType: 'plan',
      targetId: String(newPlan.id),
      newState: newPlan,
      ipAddress: req.ip,
    });
    return res.status(201).json(newPlan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create plan', code: 'INTERNAL_ERROR' });
  }
});

plansRouter.patch('/:id', requireTenantPermission('plans', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<SubscriptionPlan>(collections.subscriptionPlans, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Plan not found', code: 'NOT_FOUND' });
    }

    const updates: Record<string, unknown> = {};
    const { name, duration_days, price } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ error: 'name must be 1-100 characters', code: 'BAD_REQUEST' });
      }
      updates.name = name.trim();
    }
    if (duration_days !== undefined) {
      const days = Number(duration_days);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return res.status(400).json({ error: 'duration_days must be between 1 and 3650', code: 'BAD_REQUEST' });
      }
      updates.durationDays = days;
    }
    if (price !== undefined) {
      const amount = Number(price);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number', code: 'BAD_REQUEST' });
      }
      updates.price = amount.toFixed(2);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No supported fields to update', code: 'BAD_REQUEST' });
    }

    await updateDoc(collections.subscriptionPlans, id, updates);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'PLAN_UPDATED',
      tenantId: current.tenantId,
      targetType: 'plan',
      targetId: String(id),
      previousState: current,
      newState: updates,
      ipAddress: req.ip,
    });
    return res.json({ ...current, ...updates });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update plan', code: 'INTERNAL_ERROR', details: error.message });
  }
});

plansRouter.delete('/:id', requireTenantPermission('plans', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<SubscriptionPlan>(collections.subscriptionPlans, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Plan not found', code: 'NOT_FOUND' });
    }

    await deleteDoc(collections.subscriptionPlans, id);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'PLAN_DELETED',
      tenantId: current.tenantId,
      targetType: 'plan',
      targetId: String(id),
      previousState: current,
      ipAddress: req.ip,
    });
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete plan', code: 'INTERNAL_ERROR', details: error.message });
  }
});
