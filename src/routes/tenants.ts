import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { tenants, tenantAdmins, subscribers, devices, subscriptionPlans, auditLogs } from '../db/schema.ts';
import { eq, sql, desc, and } from 'drizzle-orm';
import { AuthenticatedRequest, requireCompanyAdmin, requireTenantAdminOrCompany } from '../middleware/auth.ts';
import { memoryStore } from '../lib/memory-store.ts';
import { logAuditAction } from '../lib/audit-logger.ts';

export const tenantsRouter = Router();

// Helper to determine device sync health
function computeSyncHealth(lastSyncedAt: Date | string | null): { health: 'healthy' | 'warning' | 'stale' | 'never'; label: string } {
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

// GET /api/tenants - List tenants (Company Admin: all, Tenant Admin: own tenant)
tenantsRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;

    try {
      if (auth.role === 'tenant_admin') {
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, auth.tenantId!))
          .limit(1);

        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
        }

        const [subCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(subscribers)
          .where(eq(subscribers.tenantId, tenant.id));

        const tenantDevices = await db
          .select()
          .from(devices)
          .where(eq(devices.tenantId, tenant.id));

        let lastSync: Date | null = null;
        tenantDevices.forEach((d) => {
          if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
            lastSync = new Date(d.lastSyncedAt);
          }
        });

        return res.json([
          {
            ...tenant,
            currentSubscribers: subCount?.count || 0,
            currentDevices: tenantDevices.length,
            lastDeviceSync: lastSync ? (lastSync as Date).toISOString() : null,
            syncHealth: computeSyncHealth(lastSync),
          },
        ]);
      }

      // Company Admin: return all enriched tenants
      const allTenants = await db.select().from(tenants).orderBy(tenants.id);
      const enriched = await Promise.all(
        allTenants.map(async (t) => {
          const [subCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(subscribers)
            .where(eq(subscribers.tenantId, t.id));

          const tenantDevices = await db
            .select()
            .from(devices)
            .where(eq(devices.tenantId, t.id));

          let lastSync: Date | null = null;
          tenantDevices.forEach((d) => {
            if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
              lastSync = new Date(d.lastSyncedAt);
            }
          });

          return {
            ...t,
            currentSubscribers: subCount?.count || 0,
            currentDevices: tenantDevices.length,
            lastDeviceSync: lastSync ? (lastSync as Date).toISOString() : null,
            syncHealth: computeSyncHealth(lastSync),
          };
        })
      );
      return res.json(enriched);
    } catch (dbErr) {
      // Memory store fallback
      if (auth.role === 'tenant_admin') {
        const tenant = memoryStore.tenants.find((t) => t.id === auth.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
        const subCount = memoryStore.subscribers.filter((s) => s.tenantId === tenant.id).length;
        const tenantDevices = memoryStore.devices.filter((d) => d.tenantId === tenant.id);
        let lastSync: any = null;
        tenantDevices.forEach((d) => {
          if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
            lastSync = d.lastSyncedAt;
          }
        });
        return res.json([
          {
            ...tenant,
            currentSubscribers: subCount,
            currentDevices: tenantDevices.length,
            lastDeviceSync: lastSync ? new Date(lastSync).toISOString() : null,
            syncHealth: computeSyncHealth(lastSync),
          },
        ]);
      }

      const enriched = memoryStore.tenants.map((t) => {
        const subCount = memoryStore.subscribers.filter((s) => s.tenantId === t.id).length;
        const tenantDevices = memoryStore.devices.filter((d) => d.tenantId === t.id);
        let lastSync: any = null;
        tenantDevices.forEach((d) => {
          if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
            lastSync = d.lastSyncedAt;
          }
        });
        return {
          ...t,
          currentSubscribers: subCount,
          currentDevices: tenantDevices.length,
          lastDeviceSync: lastSync ? new Date(lastSync).toISOString() : null,
          syncHealth: computeSyncHealth(lastSync),
        };
      });
      return res.json(enriched);
    }
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/tenants/:id - Get full tenant details (including subscribers, devices & audit history)
tenantsRouter.get('/:id', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID', code: 'BAD_REQUEST' });
    }

    const auth = req.auth!;
    if (auth.role === 'tenant_admin' && auth.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to this tenant', code: 'FORBIDDEN' });
    }

    try {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
      }

      // Fetch subscribers with plan names
      const tenantSubs = await db
        .select({
          id: subscribers.id,
          tenantId: subscribers.tenantId,
          name: subscribers.name,
          email: subscribers.email,
          phone: subscribers.phone,
          planId: subscribers.planId,
          planName: subscriptionPlans.name,
          startDate: subscribers.startDate,
          endDate: subscribers.endDate,
          status: subscribers.status,
          createdAt: subscribers.createdAt,
        })
        .from(subscribers)
        .leftJoin(subscriptionPlans, eq(subscribers.planId, subscriptionPlans.id))
        .where(eq(subscribers.tenantId, tenantId))
        .orderBy(desc(subscribers.createdAt));

      // Fetch devices with health
      const tenantDevs = await db
        .select()
        .from(devices)
        .where(eq(devices.tenantId, tenantId))
        .orderBy(desc(devices.createdAt));

      const enrichedDevs = tenantDevs.map((d) => ({
        ...d,
        syncHealth: computeSyncHealth(d.lastSyncedAt),
      }));

      // Fetch tenant admins
      const admins = await db
        .select()
        .from(tenantAdmins)
        .where(eq(tenantAdmins.tenantId, tenantId));

      // Fetch tenant plans
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.tenantId, tenantId));

      // Fetch recent audit logs for this tenant
      let recentAudits: any[] = [];
      try {
        recentAudits = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.tenantId, tenantId))
          .orderBy(desc(auditLogs.createdAt))
          .limit(20);
      } catch (auditErr) {
        recentAudits = (memoryStore.auditLogs || []).filter((a) => a.tenantId === tenantId);
      }

      let lastSync: Date | null = null;
      tenantDevs.forEach((d) => {
        if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
          lastSync = new Date(d.lastSyncedAt);
        }
      });

      return res.json({
        ...tenant,
        currentSubscribers: tenantSubs.length,
        currentDevices: tenantDevs.length,
        lastDeviceSync: lastSync ? (lastSync as Date).toISOString() : null,
        syncHealth: computeSyncHealth(lastSync),
        subscribers: tenantSubs,
        devices: enrichedDevs,
        admins,
        plans,
        auditLogs: recentAudits,
      });
    } catch (dbErr) {
      const tenant = memoryStore.tenants.find((t) => t.id === tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });

      const tenantSubs = memoryStore.subscribers
        .filter((s) => s.tenantId === tenantId)
        .map((s) => {
          const plan = memoryStore.subscriptionPlans.find((p) => p.id === s.planId);
          return {
            ...s,
            planName: plan?.name || 'Standard Membership',
          };
        });

      const tenantDevs = memoryStore.devices
        .filter((d) => d.tenantId === tenantId)
        .map((d) => ({
          ...d,
          syncHealth: computeSyncHealth(d.lastSyncedAt),
        }));

      const admins = memoryStore.tenantAdmins.filter((a) => a.tenantId === tenantId);
      const plans = memoryStore.subscriptionPlans.filter((p) => p.tenantId === tenantId);
      const recentAudits = (memoryStore.auditLogs || []).filter((a) => a.tenantId === tenantId);

      let lastSync: any = null;
      tenantDevs.forEach((d) => {
        if (d.lastSyncedAt && (!lastSync || new Date(d.lastSyncedAt) > new Date(lastSync))) {
          lastSync = d.lastSyncedAt;
        }
      });

      return res.json({
        ...tenant,
        currentSubscribers: tenantSubs.length,
        currentDevices: tenantDevs.length,
        lastDeviceSync: lastSync ? new Date(lastSync).toISOString() : null,
        syncHealth: computeSyncHealth(lastSync),
        subscribers: tenantSubs,
        devices: tenantDevs,
        admins,
        plans,
        auditLogs: recentAudits,
      });
    }
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
    } = req.body;

    if (!company_name || !contact_email) {
      return res.status(400).json({ error: 'company_name and contact_email are required', code: 'BAD_REQUEST' });
    }

    const assignedAdminEmail = admin_email || contact_email;
    const inviteToken = `inv_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const inviteUrl = `https://platform.io/invite/tenant?token=${inviteToken}&email=${encodeURIComponent(assignedAdminEmail)}`;

    let newTenant: any;
    let initialAdmin: any;

    try {
      const [insertedTenant] = await db
        .insert(tenants)
        .values({
          companyName: company_name,
          contactEmail: contact_email,
          planTier: plan_tier,
          subscriberLimit: parseInt(String(subscriber_limit), 10) || 100,
          status: status,
        })
        .returning();

      newTenant = insertedTenant;

      // Auto-generate initial tenant admin
      const [insertedAdmin] = await db
        .insert(tenantAdmins)
        .values({
          tenantId: newTenant.id,
          email: assignedAdminEmail,
          role: 'admin',
        })
        .returning();

      initialAdmin = insertedAdmin;

      // Create default subscription plans for this tenant
      await db.insert(subscriptionPlans).values([
        { tenantId: newTenant.id, name: 'Standard Monthly Pass', durationDays: 30, price: '49.00' },
        { tenantId: newTenant.id, name: 'Annual VIP Pass', durationDays: 365, price: '399.00' },
      ]);
    } catch (dbErr) {
      // Memory Store fallback
      newTenant = {
        id: memoryStore.tenants.length + 1,
        companyName: company_name,
        contactEmail: contact_email,
        planTier: plan_tier,
        subscriberLimit: parseInt(String(subscriber_limit), 10) || 100,
        status: status,
        createdAt: new Date(),
      };
      memoryStore.tenants.push(newTenant);

      initialAdmin = {
        id: memoryStore.tenantAdmins.length + 1,
        tenantId: newTenant.id,
        email: assignedAdminEmail,
        role: 'admin',
        createdAt: new Date(),
      };
      memoryStore.tenantAdmins.push(initialAdmin);

      memoryStore.subscriptionPlans.push(
        { id: memoryStore.subscriptionPlans.length + 1, tenantId: newTenant.id, name: 'Standard Monthly Pass', durationDays: 30, price: '49.00', createdAt: new Date() },
        { id: memoryStore.subscriptionPlans.length + 2, tenantId: newTenant.id, name: 'Annual VIP Pass', durationDays: 365, price: '399.00', createdAt: new Date() }
      );
    }

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

    let existingTenant: any;
    try {
      const [found] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      existingTenant = found;
    } catch (err) {
      existingTenant = memoryStore.tenants.find((t) => t.id === tenantId);
    }

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

    let updatedTenant: any;
    try {
      const [updated] = await db
        .update(tenants)
        .set(updates)
        .where(eq(tenants.id, tenantId))
        .returning();
      updatedTenant = updated;
    } catch (dbErr) {
      const target = memoryStore.tenants.find((t) => t.id === tenantId);
      if (target) {
        Object.assign(target, updates);
        updatedTenant = { ...target };
      }
    }

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
