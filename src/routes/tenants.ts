import { Router, Response } from 'express';
import crypto from 'crypto';
import { createDoc, getDoc, updateDoc, listDocs, collections } from '../db/firestore.ts';
import { Tenant, TenantAdmin, Subscriber, Device, SubscriptionPlan, AuditLog } from '../db/models.ts';
import { AuthenticatedRequest, requireCompanyAdmin, requireTenantAdminOrCompany, requireTenantPermission } from '../middleware/auth.ts';
import { resolveTenantId } from '../middleware/auth.ts';
import { logAuditAction } from '../lib/audit-logger.ts';
import { resolveTenantLabels, tenantTypeConfig, tenantTypes, TenantLabels, TenantType } from '../lib/tenant-product.ts';

export const tenantsRouter = Router();

tenantsRouter.get('/me', requireTenantPermission('profile', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(400).json({ error: 'Tenant context required', code: 'BAD_REQUEST' });

  try {
    const tenant = await getDoc<Tenant>(collections.tenants, tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    return res.json(tenant);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch tenant profile', code: 'INTERNAL_ERROR', details: error.message });
  }
});

tenantsRouter.patch('/me', requireTenantPermission('profile', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(400).json({ error: 'Tenant context required', code: 'BAD_REQUEST' });

  try {
    const current = await getDoc<Tenant>(collections.tenants, tenantId);
    if (!current) return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    const tenantType = req.body.tenantType ?? current.tenantType ?? 'gym';
    if (!tenantTypes.includes(tenantType as TenantType)) {
      return res.status(400).json({ error: 'tenantType must be gym, mess, or class', code: 'BAD_REQUEST' });
    }
    const labels = req.body.labels;
    if (labels !== undefined && (!labels || typeof labels !== 'object' || Array.isArray(labels))) {
      return res.status(400).json({ error: 'labels must be a label configuration object', code: 'BAD_REQUEST' });
    }
    const supported = ['customerSingular', 'customerPlural', 'offeringSingular', 'offeringPlural'] as const;
    const labelUpdates: Partial<TenantLabels> = {};
    if (labels) {
      if (Object.keys(labels).some((key) => !supported.includes(key as (typeof supported)[number]))) {
        return res.status(400).json({ error: 'Unsupported label field', code: 'BAD_REQUEST' });
      }
      for (const key of supported) {
        if (labels[key] !== undefined) {
          if (typeof labels[key] !== 'string' || !labels[key].trim() || labels[key].trim().length > 32) {
            return res.status(400).json({ error: `${key} must be 1-32 characters`, code: 'BAD_REQUEST' });
          }
          labelUpdates[key] = labels[key].trim();
        }
      }
    }
    const next = {
      tenantType: tenantType as TenantType,
      labels: { ...(current.labels || {}), ...labelUpdates },
    };
    await updateDoc(collections.tenants, tenantId, next);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'TENANT_CONFIGURATION_UPDATED',
      tenantId,
      targetType: 'tenant',
      targetId: String(tenantId),
      previousState: { tenantType: current.tenantType ?? 'gym', labels: current.labels ?? {} },
      newState: next,
      ipAddress: req.ip,
    });
    return res.json({ ...current, ...next, resolvedLabels: resolveTenantLabels(next.tenantType, next.labels) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update tenant configuration', code: 'INTERNAL_ERROR', details: error.message });
  }
});

tenantsRouter.get('/me/activity', requireTenantPermission('activity', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!tenantId) return res.status(400).json({ error: 'Tenant context required', code: 'BAD_REQUEST' });

  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const logs = await listDocs<AuditLog>(collections.auditLogs, [['tenantId', '==', tenantId]]);
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ logs: logs.slice(0, limit) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch tenant activity', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// Helper to determine device sync health
function computeSyncHealth(lastSyncedAt?: Date | string | null): { health: 'healthy' | 'warning' | 'stale' | 'never'; label: string } {
  if (!lastSyncedAt) {
    return { health: 'never', label: 'Never Synced' };
  }
  const syncDate = new Date(lastSyncedAt);
  const now = new Date();
  const diffHours = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 1) {
    return { health: 'healthy', label: 'Healthy (< 1 hr ago)' };
  } else if (diffHours <= 24) {
    return { health: 'warning', label: 'Delayed (< 24 hrs ago)' };
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return { health: 'stale', label: `Stale (${diffDays}d ago)` };
  }
}

function latestSync(devs: Device[]): Date | null {
  let lastSync: Date | null = null;
  devs.forEach((d) => {
    if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > lastSync)) {
      lastSync = new Date(d.lastSyncedAt);
    }
  });
  return lastSync;
}

async function enrichTenant(t: Tenant) {
  const [subs, devs] = await Promise.all([
    listDocs<Subscriber>(collections.subscribers, [['tenantId', '==', t.id]]),
    listDocs<Device>(collections.devices, [['tenantId', '==', t.id]]),
  ]);
  const lastSync = latestSync(devs);
  return {
    ...t,
    currentSubscribers: subs.length,
    currentDevices: devs.length,
    lastDeviceSync: lastSync ? lastSync.toISOString() : null,
    syncHealth: computeSyncHealth(lastSync),
  };
}

// GET /api/tenants - List tenants (Company Admin: all, Tenant Admin: own tenant)
tenantsRouter.get('/', requireTenantPermission('profile', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;

    if (auth.role === 'tenant_admin') {
      const tenant = await getDoc<Tenant>(collections.tenants, auth.tenantId!);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
      }
      return res.json([await enrichTenant(tenant)]);
    }

    // Company Admin: return all enriched tenants
    const allTenants = await listDocs<Tenant>(collections.tenants);
    allTenants.sort((a, b) => a.id - b.id);
    const enriched = await Promise.all(allTenants.map(enrichTenant));
    return res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/tenants/:id - Get full tenant details (including subscribers, devices & audit history)
tenantsRouter.get('/:id', requireTenantPermission('profile', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID', code: 'BAD_REQUEST' });
    }

    const auth = req.auth!;
    if (auth.role === 'tenant_admin' && auth.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to this tenant', code: 'FORBIDDEN' });
    }
    if (auth.role === 'tenant_admin' && auth.tenantRole !== 'owner') {
      return res.status(403).json({ error: 'Full tenant details are available to owners only', code: 'FORBIDDEN' });
    }

    const tenant = await getDoc<Tenant>(collections.tenants, tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    }

    const [rawSubs, rawDevs, admins, plans, rawAudits] = await Promise.all([
      listDocs<Subscriber>(collections.subscribers, [['tenantId', '==', tenantId]]),
      listDocs<Device>(collections.devices, [['tenantId', '==', tenantId]]),
      listDocs<TenantAdmin>(collections.tenantAdmins, [['tenantId', '==', tenantId]]),
      listDocs<SubscriptionPlan>(collections.subscriptionPlans, [['tenantId', '==', tenantId]]),
      listDocs<AuditLog>(collections.auditLogs, [['tenantId', '==', tenantId]]),
    ]);

    const planById = new Map(plans.map((p) => [p.id, p.name]));
    const tenantSubs = rawSubs
      .map((s) => ({ ...s, planName: s.planId ? planById.get(s.planId) : undefined }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const tenantDevs = rawDevs
      .map((d) => ({ ...d, syncHealth: computeSyncHealth(d.lastSyncedAt) }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const recentAudits = rawAudits
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const lastSync = latestSync(rawDevs);

    return res.json({
      ...tenant,
      currentSubscribers: tenantSubs.length,
      currentDevices: tenantDevs.length,
      lastDeviceSync: lastSync ? lastSync.toISOString() : null,
      syncHealth: computeSyncHealth(lastSync),
      subscribers: tenantSubs,
      devices: tenantDevs,
      admins,
      plans,
      auditLogs: recentAudits,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tenant', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/tenants - Create tenant (Company Admin only) + auto-generate first tenant_admin invite
tenantsRouter.post('/', requireCompanyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;
    const {
      company_name,
      contact_email,
      plan_tier = 'starter',
      subscriber_limit = 100,
      status = 'active',
      admin_email,
      tenant_type = 'gym',
    } = req.body;

    if (!company_name || !contact_email) {
      return res.status(400).json({ error: 'company_name and contact_email are required', code: 'BAD_REQUEST' });
    }
    if (!tenantTypes.includes(tenant_type as TenantType)) {
      return res.status(400).json({ error: 'tenant_type must be gym, mess, or class', code: 'BAD_REQUEST' });
    }

    const assignedAdminEmail = admin_email || contact_email;
    // An invite token grants tenant-admin access, so it needs real entropy.
    // Math.random() is seeded predictably and would let an attacker guess pending invites.
    const inviteToken = `inv_${crypto.randomBytes(24).toString('base64url')}`;
    const inviteUrl = `https://platform.io/invite/tenant?token=${inviteToken}&email=${encodeURIComponent(assignedAdminEmail)}`;

    const newTenant = await createDoc<Tenant>(collections.tenants, {
      companyName: company_name,
      contactEmail: contact_email,
      planTier: plan_tier,
      subscriberLimit: parseInt(String(subscriber_limit), 10) || 100,
      status,
      tenantType: tenant_type as TenantType,
      labels: tenantTypeConfig[tenant_type as TenantType].labels,
      createdAt: new Date().toISOString(),
    });

    const initialAdmin = await createDoc<TenantAdmin>(collections.tenantAdmins, {
      tenantId: newTenant.id,
      email: assignedAdminEmail,
      role: 'admin',
      uid: null,
      createdAt: new Date().toISOString(),
    });

    // Create default subscription plans for this tenant
    await Promise.all([
      createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
        tenantId: newTenant.id,
        name: 'Standard Monthly Pass',
        durationDays: 30,
        price: '49.00',
        createdAt: new Date().toISOString(),
      }),
      createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
        tenantId: newTenant.id,
        name: 'Annual VIP Pass',
        durationDays: 365,
        price: '399.00',
        createdAt: new Date().toISOString(),
      }),
    ]);

    // Log Audit Action
    await logAuditAction({
      actorEmail: auth.email || 'company_admin@platform.io',
      actorRole: auth.role,
      action: 'TENANT_CREATED',
      tenantId: newTenant.id,
      tenantName: newTenant.companyName,
      targetType: 'tenant',
      targetId: String(newTenant.id),
      previousState: null,
      newState: {
        companyName: newTenant.companyName,
        contactEmail: newTenant.contactEmail,
        planTier: newTenant.planTier,
        subscriberLimit: newTenant.subscriberLimit,
        adminEmail: assignedAdminEmail,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      ...newTenant,
      admin: initialAdmin,
      invite: {
        token: inviteToken,
        inviteUrl,
        adminEmail: assignedAdminEmail,
        expiresInDays: 7,
      },
      message: `Tenant "${company_name}" created successfully. First tenant_admin invite generated.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create tenant', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// PATCH /api/tenants/:id - Update subscriber limit, plan tier, or suspend/activate status (Company Admin only)
tenantsRouter.patch('/:id', requireCompanyAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;
    const tenantId = parseInt(req.params.id, 10);
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID', code: 'BAD_REQUEST' });
    }

    const { subscriber_limit, plan_tier, status, reason } = req.body;

    if (subscriber_limit === undefined && plan_tier === undefined && status === undefined) {
      return res.status(400).json({
        error: 'At least one field (subscriber_limit, plan_tier, or status) is required to update',
        code: 'BAD_REQUEST',
      });
    }

    const existingTenant = await getDoc<Tenant>(collections.tenants, tenantId);
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    }

    const updates: any = {};
    let auditAction: 'TENANT_LIMIT_UPDATED' | 'TENANT_PLAN_UPDATED' | 'TENANT_STATUS_UPDATED' = 'TENANT_LIMIT_UPDATED';

    if (subscriber_limit !== undefined) {
      const parsedLimit = parseInt(String(subscriber_limit), 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ error: 'subscriber_limit must be a positive integer', code: 'BAD_REQUEST' });
      }
      updates.subscriberLimit = parsedLimit;
      auditAction = 'TENANT_LIMIT_UPDATED';
    }

    if (plan_tier !== undefined) {
      if (!['starter', 'pro', 'enterprise'].includes(plan_tier.toLowerCase())) {
        return res.status(400).json({ error: 'plan_tier must be starter, pro, or enterprise', code: 'BAD_REQUEST' });
      }
      updates.planTier = plan_tier.toLowerCase();
      auditAction = 'TENANT_PLAN_UPDATED';
    }

    if (status !== undefined) {
      if (!['active', 'suspended'].includes(status.toLowerCase())) {
        return res.status(400).json({ error: 'status must be active or suspended', code: 'BAD_REQUEST' });
      }
      updates.status = status.toLowerCase();
      auditAction = 'TENANT_STATUS_UPDATED';
    }

    await updateDoc(collections.tenants, tenantId, updates);
    const updatedTenant = { ...existingTenant, ...updates };

    // Log the action to audit_logs
    await logAuditAction({
      actorEmail: auth.email || 'company_admin@platform.io',
      actorRole: auth.role,
      action: auditAction,
      tenantId: existingTenant.id,
      tenantName: existingTenant.companyName,
      targetType: 'tenant',
      targetId: String(existingTenant.id),
      previousState: {
        subscriberLimit: existingTenant.subscriberLimit,
        planTier: existingTenant.planTier,
        status: existingTenant.status,
      },
      newState: {
        ...updates,
        reason: reason || undefined,
      },
      ipAddress: req.ip,
    });

    return res.json({
      message: `Tenant "${existingTenant.companyName}" successfully updated`,
      tenant: updatedTenant,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update tenant', code: 'INTERNAL_ERROR', details: error.message });
  }
});
