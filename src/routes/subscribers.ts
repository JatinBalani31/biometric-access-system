import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { subscribers, tenants, subscriptionPlans } from '../db/schema.ts';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';
import { saveFaceEmbedding, getFaceEmbedding, revokeFaceEmbedding } from '../lib/firestore-sync.ts';
import { ErrorResponse, FaceEmbeddingRecord } from '../types/api.ts';
import { memoryStore } from '../lib/memory-store.ts';

export const subscribersRouter = Router();

/**
 * Helper to calculate days left and expiration status
 */
function computeSubscriberDaysLeft(endDate: Date | string) {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, diffDays);
  const isExpired = diffMs < 0;

  return {
    daysLeft,
    isExpired,
    formattedEndDate: end.toISOString().split('T')[0],
  };
}

// GET /api/subscribers - List subscribers for tenant
subscribersRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    const { search, status, plan_id, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    try {
      let query = db
        .select({
          subscriber: subscribers,
          planName: subscriptionPlans.name,
          planDuration: subscriptionPlans.durationDays,
          planPrice: subscriptionPlans.price,
        })
        .from(subscribers)
        .leftJoin(subscriptionPlans, eq(subscribers.planId, subscriptionPlans.id));

      const conditions: any[] = [];
      if (tenantId) conditions.push(eq(subscribers.tenantId, tenantId));
      if (status && typeof status === 'string') conditions.push(eq(subscribers.status, status));

      let fullQuery = query;
      if (conditions.length > 0) fullQuery = query.where(and(...conditions)) as any;

      const rows = await fullQuery.orderBy(desc(subscribers.id)).limit(limitNum).offset(offset);

      const enriched = rows.map((r) => {
        const { daysLeft, isExpired } = computeSubscriberDaysLeft(r.subscriber.endDate);
        return {
          ...r.subscriber,
          planName: r.planName || 'Unassigned',
          planDuration: r.planDuration,
          planPrice: r.planPrice,
          daysLeft,
          isExpired,
        };
      });

      return res.json({
        data: enriched,
        pagination: { page: pageNum, limit: limitNum, total: enriched.length, totalPages: 1 },
      });
    } catch (dbErr) {
      let filtered = memoryStore.subscribers.filter((s) => !tenantId || s.tenantId === tenantId);
      const enriched = filtered.map((s) => {
        const plan = memoryStore.subscriptionPlans.find((p) => p.id === s.planId);
        const { daysLeft, isExpired } = computeSubscriberDaysLeft(s.endDate);
        return {
          ...s,
          planName: plan?.name || 'Standard Plan',
          planDuration: plan?.durationDays || 30,
          planPrice: plan?.price || '49.00',
          daysLeft,
          isExpired,
        };
      });

      return res.json({
        data: enriched,
        pagination: { page: pageNum, limit: limitNum, total: enriched.length, totalPages: 1 },
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subscribers', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/subscribers/:id/days-left - Compute and return days_left based on end_date
subscribersRouter.get('/:id/days-left', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriberId = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);

    let sub: any;
    let plan: any;

    try {
      const [dbSub] = await db
        .select({
          subscriber: subscribers,
          plan: subscriptionPlans,
        })
        .from(subscribers)
        .leftJoin(subscriptionPlans, eq(subscribers.planId, subscriptionPlans.id))
        .where(eq(subscribers.id, subscriberId))
        .limit(1);

      if (dbSub) {
        sub = dbSub.subscriber;
        plan = dbSub.plan;
      }
    } catch (dbErr) {
      sub = memoryStore.subscribers.find((s) => s.id === subscriberId);
      if (sub) {
        plan = memoryStore.subscriptionPlans.find((p) => p.id === sub.planId);
      }
    }

    if (!sub) {
      return res.status(404).json({ error: 'Subscriber not found', code: 'NOT_FOUND' });
    }

    if (tenantId && sub.tenantId !== tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Access denied to this subscriber', code: 'FORBIDDEN' });
    }

    const { daysLeft, isExpired, formattedEndDate } = computeSubscriberDaysLeft(sub.endDate);
    const now = new Date();
    const startDate = sub.startDate ? new Date(sub.startDate) : new Date();
    const totalDurationDays = Math.max(1, Math.ceil((new Date(sub.endDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const percentRemaining = isExpired ? 0 : Math.max(0, Math.min(100, Math.round((daysLeft / totalDurationDays) * 100)));

    res.json({
      subscriberId: sub.id,
      name: sub.name,
      email: sub.email,
      tenantId: sub.tenantId,
      planName: plan?.name || 'Standard Pass',
      startDate: sub.startDate,
      endDate: sub.endDate,
      formattedEndDate,
      daysLeft,
      daysElapsed,
      totalDurationDays,
      percentRemaining,
      isExpired,
      status: isExpired ? 'expired' : sub.status,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute days left', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/subscribers - Create Subscriber (ENFORCES SUBSCRIBER LIMIT)
subscribersRouter.post('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });
    }

    let tenant: any;
    let currentCount = 0;

    try {
      const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      tenant = t;
      if (tenant) {
        const [c] = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers).where(eq(subscribers.tenantId, tenantId));
        currentCount = c?.count || 0;
      }
    } catch (dbErr) {
      tenant = memoryStore.tenants.find((t) => t.id === tenantId);
      currentCount = memoryStore.subscribers.filter((s) => s.tenantId === tenantId).length;
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Tenant is suspended. Cannot create subscribers.', code: 'TENANT_SUSPENDED' });
    }

    const subscriberLimit = tenant.subscriberLimit ?? 100;
    if (currentCount >= subscriberLimit) {
      const errorRes: ErrorResponse = {
        error: `Subscriber limit of ${subscriberLimit} reached for tenant "${tenant.companyName}". Please upgrade the plan tier to add more subscribers.`,
        code: 'LIMIT_EXCEEDED',
        limit: subscriberLimit,
        currentCount,
      };
      return res.status(422).json(errorRes);
    }

    const { name, phone, email, plan_id, start_date, end_date, duration_days, generate_embedding = true } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Subscriber name is required', code: 'BAD_REQUEST' });
    }

    const start = start_date ? new Date(start_date) : new Date();
    const end = end_date ? new Date(end_date) : new Date(start.getTime() + (parseInt(duration_days, 10) || 30) * 24 * 60 * 60 * 1000);

    let newSubscriber: any;
    try {
      const [inserted] = await db.insert(subscribers).values({
        tenantId,
        name,
        phone: phone || null,
        email: email || null,
        planId: plan_id ? parseInt(plan_id, 10) : null,
        startDate: start,
        endDate: end,
        status: 'active',
      }).returning();
      newSubscriber = inserted;
    } catch (dbErr) {
      newSubscriber = {
        id: memoryStore.subscribers.length + 1,
        tenantId,
        name,
        phone: phone || null,
        email: email || null,
        planId: plan_id ? parseInt(plan_id, 10) : null,
        startDate: start,
        endDate: end,
        status: 'active',
        createdAt: new Date(),
      };
      memoryStore.subscribers.push(newSubscriber);
    }

    let embeddingRecord: FaceEmbeddingRecord | null = null;
    if (generate_embedding) {
      embeddingRecord = await saveFaceEmbedding({
        tenantId,
        subscriberId: newSubscriber.id,
        subscriberName: newSubscriber.name,
        email: newSubscriber.email || '',
        status: 'active',
      });
    }

    const { daysLeft, isExpired } = computeSubscriberDaysLeft(newSubscriber.endDate);

    res.status(201).json({
      ...newSubscriber,
      daysLeft,
      isExpired,
      faceEmbedding: embeddingRecord,
      tenantLimit: {
        limit: subscriberLimit,
        currentCount: currentCount + 1,
        remainingSlots: Math.max(0, subscriberLimit - (currentCount + 1)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create subscriber', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/subscribers/:id - Get single subscriber
subscribersRouter.get('/:id', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriberId = parseInt(req.params.id, 10);
    const sub = memoryStore.subscribers.find((s) => s.id === subscriberId);
    if (!sub) return res.status(404).json({ error: 'Subscriber not found', code: 'NOT_FOUND' });
    const { daysLeft, isExpired } = computeSubscriberDaysLeft(sub.endDate);
    const embedding = await getFaceEmbedding(sub.tenantId, sub.id);
    return res.json({ ...sub, daysLeft, isExpired, faceEmbedding: embedding });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subscriber', code: 'INTERNAL_ERROR' });
  }
});
