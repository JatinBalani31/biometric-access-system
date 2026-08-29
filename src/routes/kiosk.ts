import { Router, Response } from 'express';
import { getDoc, listDocs, findOne, clearCollection, collections } from '../db/firestore.ts';
import { Subscriber, SubscriptionPlan } from '../db/models.ts';
import { AuthenticatedRequest, requireDeviceOrTenantAdmin, resolveTenantId } from '../middleware/auth.ts';
import { clearAllFirestoreEmbeddings, fetchFaceEmbeddingsForTenant, recordDeviceSyncLog, saveFaceEmbedding } from '../lib/firestore-sync.ts';
import { DeviceSyncResponse, FACE_EMBEDDING_DIM, FACE_MODEL_ID, SYNTHETIC_MODEL_ID } from '../types/api.ts';

export const kioskRouter = Router();

// POST /api/kiosk/reset-all - Wipe all subscriber embeddings and reset to clean state
kioskRouter.post('/reset-all', async (_req: any, res: Response) => {
  try {
    await clearAllFirestoreEmbeddings();
    const removed = await clearCollection(collections.subscribers);
    console.log(`[Kiosk] Wiped all subscribers (${removed}) and face embeddings.`);
    res.json({ success: true, message: `Cleaned: 1 tenant, 0 subscribers` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kiosk/face-embeddings - Incremental face embeddings sync for kiosk devices
kioskRouter.get('/face-embeddings', requireDeviceOrTenantAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const auth = req.auth!;
    const tenantId = resolveTenantId(req) || 1;

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

    const currentSubs = await listDocs<Subscriber>(collections.subscribers, [['tenantId', '==', tenantId]]);
    const plans = await listDocs<SubscriptionPlan>(collections.subscriptionPlans, [['tenantId', '==', tenantId]]);

    // Vectors enrolled by an older/other extractor cannot be matched on-device.
    // Keep them out of the gallery and report the count so the mismatch is visible.
    const compatible = result.embeddings.filter(
      (e) =>
        Array.isArray(e.vector) &&
        e.vector.length === FACE_EMBEDDING_DIM &&
        e.modelId !== SYNTHETIC_MODEL_ID
    );
    const incompatible = result.embeddings.length - compatible.length;
    if (incompatible > 0) {
      console.warn(
        `[Kiosk Sync] Skipped ${incompatible} embedding(s) not produced by ${FACE_MODEL_ID} ` +
        `(expected ${FACE_EMBEDDING_DIM}-D). Those subscribers must re-enrol.`
      );
    }

    const embeddings = compatible.map((e) => {
      const sub = currentSubs.find((s) => s.id === e.subscriberId);
      const plan = sub?.planId ? plans.find((p) => p.id === sub.planId) : null;
      const endMs = sub?.endDate ? new Date(sub.endDate).getTime() : Date.now() + 30 * 86400000;
      const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
      const isExpired = sub ? new Date(sub.endDate).getTime() < Date.now() : false;

      return {
        ...e,
        planName: plan?.name || (e as any).planName || 'Monthly All-Access Pass',
        daysLeft: (e as any).daysLeft ?? daysLeft,
        isExpired: (e as any).isExpired ?? isExpired,
      };
    });

    const now = new Date();
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
      modelId: FACE_MODEL_ID,
      embeddingDimension: FACE_EMBEDDING_DIM,
      skippedIncompatible: incompatible,
    };

    if (auth.deviceId) {
      await recordDeviceSyncLog({
        deviceId: auth.deviceId,
        tenantId,
        deviceName: auth.deviceName,
        syncedCount: embeddings.length,
        since: sinceTimestamp,
        ip: req.ip,
      });
    }

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

    let foundSub: Subscriber | null = null;
    let planName: string = 'Standard Membership';

    if (subscriber_id) {
      const sub = await getDoc<Subscriber>(collections.subscribers, parseInt(subscriber_id, 10));
      foundSub = sub && sub.tenantId === tenantId ? sub : null;
    } else if (email) {
      const sub = await findOne<Subscriber>(collections.subscribers, 'email', email);
      foundSub = sub && sub.tenantId === tenantId ? sub : null;
    } else if (phone) {
      const sub = await findOne<Subscriber>(collections.subscribers, 'phone', phone);
      foundSub = sub && sub.tenantId === tenantId ? sub : null;
    }

    if (foundSub?.planId) {
      const plan = await getDoc<SubscriptionPlan>(collections.subscriptionPlans, foundSub.planId);
      planName = plan?.name || 'Standard Membership';
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

// POST /api/kiosk/enroll-face - Update / enroll on-device face vector for a subscriber
kioskRouter.post('/enroll-face', requireDeviceOrTenantAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    const { subscriber_id, face_vector } = req.body;

    if (!subscriber_id || !face_vector || !Array.isArray(face_vector)) {
      return res.status(400).json({ error: 'subscriber_id and face_vector array are required', code: 'BAD_REQUEST' });
    }

    // A vector from a different extractor is not comparable to the kiosk gallery.
    // Reject it here rather than storing a face that can never match.
    if (face_vector.length !== FACE_EMBEDDING_DIM) {
      return res.status(422).json({
        error: `face_vector must be ${FACE_EMBEDDING_DIM}-D from ${FACE_MODEL_ID}, got ${face_vector.length}-D`,
        code: 'BAD_REQUEST',
        expectedDimension: FACE_EMBEDDING_DIM,
        expectedModel: FACE_MODEL_ID,
      });
    }

    const subId = parseInt(String(subscriber_id), 10);
    let subscriberName = 'Subscriber';
    let email = '';

    const found = await getDoc<Subscriber>(collections.subscribers, subId);
    if (found && found.tenantId === tenantId) {
      subscriberName = found.name;
      email = found.email || '';
    }

    const record = await saveFaceEmbedding({
      tenantId: tenantId!,
      subscriberId: subId,
      subscriberName,
      email,
      vector: face_vector,
      status: 'active',
    });

    res.json({
      success: true,
      embedding: record,
      message: `Enrolled face vector (${face_vector.length}-D) for ${subscriberName}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to enroll face', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/kiosk/configure - Emergency config endpoint for when admin UI is broken
// Allows setting backend URL + token via device token auth
kioskRouter.post('/configure', requireDeviceOrTenantAdmin, (req: any, res: Response) => {
  try {
    const { backendUrl, deviceToken, threshold, syncIntervalMinutes } = req.body;
    const config: any = {};

    if (backendUrl) config.backendUrl = backendUrl;
    if (deviceToken) config.deviceToken = deviceToken;
    if (threshold !== undefined) config.threshold = parseFloat(String(threshold));
    if (syncIntervalMinutes !== undefined) config.syncIntervalMinutes = parseInt(String(syncIntervalMinutes), 10);

    res.json({
      success: true,
      message: 'Configuration received. Apply these on-device via admin prefs or build config.',
      config,
      instructions: [
        '1. In local.properties, set BACKEND_URL=' + (backendUrl || 'http://YOUR_PC_IP:3000'),
        '2. Rebuild and reinstall the APK',
        'OR clear app data and restart (to reset encrypted prefs cache)',
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Config update failed', details: error.message });
  }
});
