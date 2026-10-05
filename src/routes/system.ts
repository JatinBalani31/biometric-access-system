import { Router, Response } from 'express';
import { collections, createDoc, listDocs, findOne, clearCollection } from '../db/firestore.ts';
import { Tenant, TenantAdmin, SubscriptionPlan, Subscriber, Device, CompanyAdmin, AuditLog } from '../db/models.ts';
import { AuthenticatedRequest, requireCompanyAdmin } from '../middleware/auth.ts';
import { saveFaceEmbedding, generateSyntheticEmbedding } from '../lib/firestore-sync.ts';
import { SYNTHETIC_MODEL_ID } from '../types/api.ts';

export const systemRouter = Router();
systemRouter.use(requireCompanyAdmin);

// Plan Tier Pricing mapping (Monthly rate in USD)
const TIER_PRICING: Record<string, number> = {
  starter: 99.00,
  pro: 299.00,
  enterprise: 799.00,
};

// GET /api/system/summary - Public/Admin system dashboard summary
systemRouter.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [tenantList, subscriberList, planList, deviceList] = await Promise.all([
      listDocs<Tenant>(collections.tenants),
      listDocs<Subscriber>(collections.subscribers),
      listDocs<SubscriptionPlan>(collections.subscriptionPlans),
      listDocs<Device>(collections.devices),
    ]);

    const sortedTenants = [...tenantList].sort((a, b) => a.id - b.id);

    return res.json({
      status: 'operational',
      database: 'Cloud SQL (PostgreSQL)',
      faceEmbeddingsStore: 'Firebase Firestore',
      counts: {
        tenants: tenantList.length,
        subscribers: subscriberList.length,
        plans: planList.length,
        devices: deviceList.length,
      },
      tenants: sortedTenants,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch system summary', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/system/usage-analytics - Usage metrics (Growth trends, limit warnings, stale device syncs)
systemRouter.get('/usage-analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staleDaysParam = parseInt(String(req.query.stale_days || '3'), 10);
    const staleThresholdMs = staleDaysParam * 24 * 60 * 60 * 1000;
    const now = new Date();

    const [allTenants, allSubscribers, allDevices] = await Promise.all([
      listDocs<Tenant>(collections.tenants),
      listDocs<Subscriber>(collections.subscribers),
      listDocs<Device>(collections.devices),
    ]);

    // 1. Capacity Analysis (Tenants near or exceeding subscriber limit)
    const capacityAlerts = allTenants.map((t) => {
      const tenantSubs = allSubscribers.filter((s) => s.tenantId === t.id && s.status === 'active');
      const count = tenantSubs.length;
      const limit = t.subscriberLimit || 100;
      const percentage = Math.round((count / limit) * 100);
      const isExceeded = count >= limit;
      const isNearLimit = percentage >= 80;

      return {
        tenantId: t.id,
        companyName: t.companyName,
        planTier: t.planTier,
        status: t.status,
        subscriberCount: count,
        subscriberLimit: limit,
        usagePercentage: percentage,
        isNearLimit,
        isExceeded,
        severity: isExceeded ? 'critical' : isNearLimit ? 'warning' : 'normal',
      };
    });

    const tenantsNearLimit = capacityAlerts.filter((a) => a.isNearLimit || a.isExceeded);

    // 2. Stale Device Sync Analysis (Devices not synced in > X days)
    const staleDevices = allDevices
      .map((d) => {
        const tenant = allTenants.find((t) => t.id === d.tenantId);
        const lastSync = d.lastSyncedAt ? new Date(d.lastSyncedAt) : null;
        const diffMs = lastSync ? now.getTime() - lastSync.getTime() : Infinity;
        const diffDays = lastSync ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : null;
        const isStale = diffMs > staleThresholdMs || !lastSync;

        return {
          deviceId: d.id,
          deviceName: d.deviceName,
          tenantId: d.tenantId,
          tenantName: tenant?.companyName || 'Unknown Tenant',
          status: d.status,
          lastSyncedAt: lastSync ? lastSync.toISOString() : null,
          daysSinceSync: diffDays,
          isStale,
        };
      })
      .filter((d) => d.isStale);

    // 3. Multi-Tenant Subscriber Growth over Time (Simulated/Aggregated 6-month historical buckets)
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const totalCurrentSubs = allSubscribers.length;

    // Build aggregate timeline
    const subscriberTimeline = months.map((month, idx) => {
      // Historical trend calculation
      const factor = (idx + 1) / months.length;
      const count = Math.max(1, Math.round(totalCurrentSubs * (0.4 + 0.6 * factor)));
      return {
        month,
        totalSubscribers: count,
        activeTenants: allTenants.filter((t) => t.status === 'active').length,
      };
    });

    return res.json({
      summary: {
        totalTenants: allTenants.length,
        activeTenants: allTenants.filter((t) => t.status === 'active').length,
        suspendedTenants: allTenants.filter((t) => t.status === 'suspended').length,
        totalSubscribers: allSubscribers.length,
        totalDevices: allDevices.length,
        tenantsAtRiskCount: tenantsNearLimit.length,
        staleDevicesCount: staleDevices.length,
      },
      capacityAlerts: tenantsNearLimit,
      allCapacityStats: capacityAlerts,
      staleDevices,
      staleDaysThreshold: staleDaysParam,
      subscriberTimeline,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch usage analytics', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/system/billing - Basic billing overview & revenue per tenant
systemRouter.get('/billing', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allTenants, allSubscribers] = await Promise.all([
      listDocs<Tenant>(collections.tenants),
      listDocs<Subscriber>(collections.subscribers),
    ]);

    const tenantBilling = allTenants.map((t) => {
      const activeSubs = allSubscribers.filter((s) => s.tenantId === t.id && s.status === 'active').length;
      const tier = (t.planTier || 'starter').toLowerCase();
      const monthlyRate = TIER_PRICING[tier] || 99.00;
      const isSuspended = t.status === 'suspended';

      // Next billing date: 1st of next month
      const now = new Date();
      const nextInvoice = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

      return {
        tenantId: t.id,
        companyName: t.companyName,
        contactEmail: t.contactEmail,
        planTier: tier,
        status: t.status,
        subscriberCount: activeSubs,
        subscriberLimit: t.subscriberLimit,
        monthlyRate,
        annualizedRate: monthlyRate * 12,
        nextInvoiceDate: nextInvoice,
        billingStatus: isSuspended ? 'Past Due / Suspended' : 'Paid & Active',
        currency: 'USD',
      };
    });

    const activeBilling = tenantBilling.filter((b) => b.status === 'active');
    const totalMRR = activeBilling.reduce((sum, b) => sum + b.monthlyRate, 0);
    const totalARR = totalMRR * 12;

    const tierBreakdown = {
      starter: {
        count: tenantBilling.filter((b) => b.planTier === 'starter').length,
        pricePerMonth: TIER_PRICING.starter,
        features: 'Up to 50 subscribers, 1 Kiosk device, Basic Email Support',
      },
      pro: {
        count: tenantBilling.filter((b) => b.planTier === 'pro').length,
        pricePerMonth: TIER_PRICING.pro,
        features: 'Up to 250 subscribers, 5 Kiosk devices, On-device biometric delta sync, Priority Support',
      },
      enterprise: {
        count: tenantBilling.filter((b) => b.planTier === 'enterprise').length,
        pricePerMonth: TIER_PRICING.enterprise,
        features: 'Unlimited subscribers & devices, Custom SLA, Dedicated instance, Keystore encryption',
      },
    };

    return res.json({
      summary: {
        mrr: totalMRR,
        arr: totalARR,
        activePayingTenants: activeBilling.length,
        totalTenants: tenantBilling.length,
        currency: 'USD',
      },
      tierBreakdown,
      tenants: tenantBilling,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch billing overview', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/system/audit-logs - Query audit trail
systemRouter.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenant_id, limit = '50' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));

    let logs: AuditLog[];
    if (tenant_id) {
      logs = await listDocs<AuditLog>(collections.auditLogs, [['tenantId', '==', parseInt(String(tenant_id), 10)]]);
    } else {
      logs = await listDocs<AuditLog>(collections.auditLogs);
    }

    logs = logs
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitNum);

    return res.json({
      total: logs.length,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/system/seed - Seed multi-tenant demo data.
// With ?force=true this truncates every collection, so it is company_admin only and
// refuses to run outside a sandbox: demo records must never reach a real deployment.
systemRouter.post('/seed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (process.env.ALLOW_DEMO_SEED !== 'true') {
      return res.status(403).json({
        error: 'Demo seeding is disabled. Set ALLOW_DEMO_SEED=true in a non-production environment to enable it.',
        code: 'SEED_DISABLED',
      });
    }

    // Check if tenants exist
    const existingTenants = await listDocs<Tenant>(collections.tenants);
    if (existingTenants.length > 0 && req.query.force !== 'true') {
      return res.json({
        message: 'Database already populated. Use ?force=true to reseed.',
        tenantCount: existingTenants.length,
        tenants: existingTenants,
      });
    }

    // Clean up if force=true
    if (req.query.force === 'true') {
      await clearCollection(collections.subscribers);
      await clearCollection(collections.devices);
      await clearCollection(collections.subscriptionPlans);
      await clearCollection(collections.tenantAdmins);
      await clearCollection(collections.tenants);
      await clearCollection(collections.companyAdmins);
      await clearCollection(collections.auditLogs);
    }

    const nowIso = new Date().toISOString();

    // 1. Create Superadmin
    const existingSuperadmin = await findOne<CompanyAdmin>(collections.companyAdmins, 'email', 'superadmin@platform.io');
    if (!existingSuperadmin) {
      await createDoc<CompanyAdmin>(collections.companyAdmins, {
        email: 'superadmin@platform.io',
        role: 'superadmin',
        uid: null,
        createdAt: nowIso,
      });
    }

    // 2. Tenant 1: Apex Fitness Center
    const tenant1 = await createDoc<Tenant>(collections.tenants, {
      companyName: 'Apex Health & Fitness',
      contactEmail: 'contact@apexfitness.com',
      planTier: 'pro',
      subscriberLimit: 100,
      status: 'active',
      createdAt: nowIso,
    });

    await createDoc<TenantAdmin>(collections.tenantAdmins, {
      tenantId: tenant1.id,
      email: 'admin@apexfitness.com',
      role: 'admin',
      uid: null,
      createdAt: nowIso,
    });
    await createDoc<TenantAdmin>(collections.tenantAdmins, {
      tenantId: tenant1.id,
      email: 'manager@apexfitness.com',
      role: 'manager',
      uid: null,
      createdAt: nowIso,
    });

    const plan1A = await createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
      tenantId: tenant1.id,
      name: 'Monthly Premium Membership',
      durationDays: 30,
      price: '59.00',
      createdAt: nowIso,
    });

    const plan1B = await createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
      tenantId: tenant1.id,
      name: 'Quarterly VIP Pass',
      durationDays: 90,
      price: '149.00',
      createdAt: nowIso,
    });

    const now = new Date();

    const sub1 = await createDoc<Subscriber>(collections.subscribers, {
      tenantId: tenant1.id,
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+1 (555) 234-5678',
      planId: plan1B.id,
      startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: nowIso,
    });

    const sub2 = await createDoc<Subscriber>(collections.subscribers, {
      tenantId: tenant1.id,
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '+1 (555) 876-5432',
      planId: plan1A.id,
      startDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: nowIso,
    });

    await createDoc<Device>(collections.devices, {
      tenantId: tenant1.id,
      deviceName: 'Main Turnstile Kiosk A',
      deviceToken: 'dev_apex_kiosk_main_a109bf83',
      status: 'active',
      lastSyncedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      createdAt: nowIso,
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    // 3. Tenant 2: Metro Co-Working Hub
    const tenant2 = await createDoc<Tenant>(collections.tenants, {
      companyName: 'Metro Co-Working Hub',
      contactEmail: 'ops@metrohub.space',
      planTier: 'starter',
      subscriberLimit: 3,
      status: 'active',
      createdAt: nowIso,
    });

    await createDoc<TenantAdmin>(collections.tenantAdmins, {
      tenantId: tenant2.id,
      email: 'admin@metrohub.space',
      role: 'admin',
      uid: null,
      createdAt: nowIso,
    });

    const plan2A = await createDoc<SubscriptionPlan>(collections.subscriptionPlans, {
      tenantId: tenant2.id,
      name: 'Hot Desk Monthly',
      durationDays: 30,
      price: '199.00',
      createdAt: nowIso,
    });

    const sub3 = await createDoc<Subscriber>(collections.subscribers, {
      tenantId: tenant2.id,
      name: 'Jordan Hayes',
      email: 'jordan@techstartup.io',
      phone: '+1 (555) 111-2233',
      planId: plan2A.id,
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdAt: nowIso,
    });

    await createDoc<Device>(collections.devices, {
      tenantId: tenant2.id,
      deviceName: 'Reception Facial Access Gate',
      deviceToken: 'dev_metro_reception_kiosk_c71a39d2',
      status: 'active',
      lastSyncedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      createdAt: nowIso,
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    // 4. Seed Firestore Face Embeddings
    for (const sub of [sub1, sub2, sub3]) {
      await saveFaceEmbedding({
        tenantId: sub.tenantId,
        subscriberId: sub.id,
        subscriberName: sub.name,
        email: sub.email || '',
        vector: generateSyntheticEmbedding(sub.id * 31 + sub.tenantId),
        modelId: SYNTHETIC_MODEL_ID,
        status: sub.status === 'active' ? 'active' : 'revoked',
      });
    }

    res.json({
      message: 'Multi-tenant database seeded successfully',
      seeded: {
        tenants: [tenant1, tenant2],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to seed database', code: 'INTERNAL_ERROR', details: error.message });
  }
});
