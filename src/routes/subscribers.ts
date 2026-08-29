import { Router, Response } from 'express';
import { collections, createDoc, getDoc, listDocs } from '../db/firestore.ts';
import { Subscriber, NewSubscriber, SubscriptionPlan, Tenant } from '../db/models.ts';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';
import { saveFaceEmbedding, getFaceEmbedding } from '../lib/firestore-sync.ts';
import { ErrorResponse, FaceEmbeddingRecord, CreateSubscriberRequest } from '../types/api.ts';

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

    const where: [string, FirebaseFirestore.WhereFilterOp, any][] = [];
    if (tenantId) where.push(['tenantId', '==', tenantId]);
    if (status && typeof status === 'string') where.push(['status', '==', status]);

    const allSubscribers = await listDocs<Subscriber>(collections.subscribers, where.length ? where : undefined);
    allSubscribers.sort((a, b) => b.id - a.id);
    const pageSubscribers = allSubscribers.slice(offset, offset + limitNum);

    const planCache = new Map<number, SubscriptionPlan | null>();
    const enriched: Array<Subscriber & { planName: string; planDuration?: number; planPrice?: string; daysLeft: number; isExpired: boolean }> = [];
    for (const sub of pageSubscribers) {
      let plan: SubscriptionPlan | null = null;
      if (sub.planId != null) {
        if (!planCache.has(sub.planId)) {
          planCache.set(sub.planId, await getDoc<SubscriptionPlan>(collections.subscriptionPlans, sub.planId));
        }
        plan = planCache.get(sub.planId) ?? null;
      }
      const { daysLeft, isExpired } = computeSubscriberDaysLeft(sub.endDate);
      enriched.push({
        ...sub,
        planName: plan?.name || 'Unassigned',
        planDuration: plan?.durationDays,
        planPrice: plan?.price,
        daysLeft,
        isExpired,
      });
    }

    return res.json({
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total: enriched.length, totalPages: 1 },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subscribers', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// GET /api/subscribers/:id/days-left - Compute and return days_left based on end_date
subscribersRouter.get('/:id/days-left', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscriberId = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);

    const sub = await getDoc<Subscriber>(collections.subscribers, subscriberId);
    const plan = sub && sub.planId != null ? await getDoc<SubscriptionPlan>(collections.subscriptionPlans, sub.planId) : null;

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

    const tenant = await getDoc<Tenant>(collections.tenants, tenantId);
    let currentCount = 0;
    if (tenant) {
      const existing = await listDocs<Subscriber>(collections.subscribers, [['tenantId', '==', tenantId]]);
      currentCount = existing.length;
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

    const { name, phone, email, plan_id, start_date, end_date, duration_days, face_vector } = req.body as CreateSubscriberRequest & { start_date?: string, end_date?: string };
    if (!name) {
      return res.status(400).json({ error: 'Subscriber name is required', code: 'BAD_REQUEST' });
    }

    const start = start_date ? new Date(start_date) : new Date();
    const end = end_date ? new Date(end_date) : new Date(start.getTime() + (duration_days || 30) * 24 * 60 * 60 * 1000);

    const newSubscriber = await createDoc<Subscriber>(collections.subscribers, {
      tenantId,
      name,
      phone: phone || null,
      email: email || null,
      planId: plan_id ? (plan_id as any) : null,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    } as NewSubscriber);

    let embeddingRecord: FaceEmbeddingRecord | null = null;
    if (face_vector && Array.isArray(face_vector)) {
      embeddingRecord = await saveFaceEmbedding({
        tenantId,
        subscriberId: newSubscriber.id,
        subscriberName: newSubscriber.name,
        email: newSubscriber.email || '',
        vector: face_vector,
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
    const sub = await getDoc<Subscriber>(collections.subscribers, subscriberId);
    if (!sub) return res.status(404).json({ error: 'Subscriber not found', code: 'NOT_FOUND' });
    const { daysLeft, isExpired } = computeSubscriberDaysLeft(sub.endDate);
    const embedding = await getFaceEmbedding(sub.tenantId, sub.id);
    return res.json({ ...sub, daysLeft, isExpired, faceEmbedding: embedding });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch subscriber', code: 'INTERNAL_ERROR' });
  }
});
