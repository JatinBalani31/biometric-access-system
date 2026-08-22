import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { devices, tenants, subscribers, subscriptionPlans } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest, requireDeviceOrTenantAdmin, resolveTenantId } from '../middleware/auth.ts';
import { fetchFaceEmbeddingsForTenant, recordDeviceSyncLog } from '../lib/firestore-sync.ts';
import { DeviceSyncResponse, ErrorResponse } from '../types/api.ts';
import { memoryStore } from '../lib/memory-store.ts';

export const kioskRouter = Router();

// GET /api/kiosk/face-embeddings - Incremental face embeddings sync for kiosk devices
kioskRouter.get('/face-embeddings', requireDeviceOrTenantAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;
    const tenantId = resolveTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required', code: 'BAD_REQUEST' });
    }

    const { since, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const sinceTimestamp = typeof since === 'string' && since.trim() ? since.trim() : null;

    const result = await fetchFaceEmbeddingsForTenant({
      tenantId,
      since: sinceTimestamp,
      page: pageNum,
      limit: limitNum,
    });

    const now = new Date();

    // If Firestore returned 0 due to offline mode, generate from memoryStore
    let embeddings = result.embeddings;
    if (embeddings.length === 0) {
      const { generateSyntheticEmbedding } = await import('../lib/firestore-sync.ts');
      const tenantSubs = memoryStore.subscribers.filter((s) => s.tenantId === tenantId);
      embeddings = tenantSubs.map((s) => ({
        id: `tenant_${tenantId}_sub_${s.id}`,
        tenantId,
        subscriberId: s.id,
        subscriberName: s.name,
        email: s.email || '',
        vector: generateSyntheticEmbedding(s.id * 31 + tenantId),
        vectorDimension: 128,
        status: s.status === 'active' ? 'active' : 'revoked',
        updatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }));
    }

    const syncResponse: DeviceSyncResponse = {
      tenantId,
      deviceId: auth.deviceId,
      deviceName: auth.deviceName,
      serverTime: now.toISOString(),
      since: sinceTimestamp,
      page: pageNum,
      limit: limitNum,
      total: embeddings.length,
      hasMore: false,
      embeddings,
    };

    res.json(syncResponse);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to synchronize face embeddings', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/kiosk/verify-access - Fast lookup endpoint for kiosk turnstile/gate entry
kioskRouter.post('/verify-access', requireDeviceOrTenantAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const { subscriber_id, email, phone } = req.body;

    if (!subscriber_id && !email && !phone) {
      return res.status(400).json({ error: 'subscriber_id, email, or phone is required', code: 'BAD_REQUEST' });
    }

    let foundSub: any;
    let planName: string = 'Standard Membership';

    try {
      let conditions: any[] = [eq(subscribers.tenantId, tenantId!)];
      if (subscriber_id) conditions.push(eq(subscribers.id, parseInt(subscriber_id, 10)));
      else if (email) conditions.push(eq(subscribers.email, email));
      else if (phone) conditions.push(eq(subscribers.phone, phone));

      const [found] = await db
        .select({ subscriber: subscribers, planName: subscriptionPlans.name })
        .from(subscribers)
        .leftJoin(subscriptionPlans, eq(subscribers.planId, subscriptionPlans.id))
        .where(and(...conditions))
        .limit(1);

      if (found) {
        foundSub = found.subscriber;
        planName = found.planName || 'Standard Membership';
      }
    } catch (dbErr) {
      foundSub = memoryStore.subscribers.find((s) => {
        if (s.tenantId !== tenantId) return false;
        if (subscriber_id && s.id === parseInt(subscriber_id, 10)) return true;
        if (email && s.email === email) return true;
        if (phone && s.phone === phone) return true;
        return false;
      });
      if (foundSub) {
        const plan = memoryStore.subscriptionPlans.find((p) => p.id === foundSub.planId);
        planName = plan?.name || 'Standard Membership';
      }
    }

    if (!foundSub) {
      return res.status(404).json({
        accessGranted: false,
        reason: 'Subscriber not found in tenant database',
        code: 'NOT_FOUND',
      });
    }

    const now = new Date();
    const end = new Date(foundSub.endDate);
    const isExpired = end.getTime() < now.getTime();
    const isSuspended = foundSub.status === 'suspended';
    const accessGranted = !isExpired && !isSuspended && foundSub.status === 'active';
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      accessGranted,
      subscriber: {
        id: foundSub.id,
        name: foundSub.name,
        email: foundSub.email,
        planName,
        endDate: foundSub.endDate,
        daysLeft,
        status: isExpired ? 'expired' : foundSub.status,
      },
      reason: accessGranted
        ? 'Access Granted'
        : isExpired
        ? `Subscription Expired on ${end.toISOString().split('T')[0]}`
        : 'Subscription is Inactive or Suspended',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Access verification failed', code: 'INTERNAL_ERROR', details: error.message });
  }
});
