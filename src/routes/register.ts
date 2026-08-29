import { Router, Request, Response } from 'express';
import { collections, createDoc, getDoc, listDocs } from '../db/firestore.ts';
import { Tenant, SubscriptionPlan, Subscriber, NewSubscriber } from '../db/models.ts';
import { saveFaceEmbedding } from '../lib/firestore-sync.ts';
import { FACE_EMBEDDING_DIM, FACE_MODEL_ID } from '../types/api.ts';

export const registerRouter = Router();

// GET /api/register/tenants — Public: list active tenants for registration picker
registerRouter.get('/tenants', async (_req: Request, res: Response) => {
  try {
    const rows = await listDocs<Tenant>(collections.tenants, [['status', '==', 'active']]);
    return res.json(rows.map((t) => ({ id: t.id, companyName: t.companyName, planTier: t.planTier })));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tenants', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/register/plans?tenant_id=X — Public: fetch plans for a given tenant
registerRouter.get('/plans', async (req: Request, res: Response) => {
  const tenantId = parseInt(String(req.query.tenant_id || ''), 10);
  if (!tenantId || isNaN(tenantId)) {
    return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });
  }
  try {
    const rows = await listDocs<SubscriptionPlan>(collections.subscriptionPlans, [['tenantId', '==', tenantId]]);
    return res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch plans', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/register — Public: self-register subscriber with face vector
registerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { tenant_id, name, email, phone, plan_id, face_vector } = req.body;

    if (!tenant_id || !name) {
      return res.status(400).json({ error: 'tenant_id and name are required', code: 'BAD_REQUEST' });
    }

    // Mirror the client-side rules — never trust the browser as the only gate.
    const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_PATTERN = /^[+]?[\d][\d\s-]{6,17}$/;

    const trimmedName = String(name).trim();
    if (!NAME_PATTERN.test(trimmedName)) {
      return res.status(400).json({
        error: 'Name must be 2-80 characters and contain only letters, spaces, hyphens, or apostrophes.',
        code: 'BAD_REQUEST',
      });
    }
    if (email && !EMAIL_PATTERN.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email address.', code: 'BAD_REQUEST' });
    }
    if (phone && !PHONE_PATTERN.test(String(phone).trim())) {
      return res.status(400).json({ error: 'Invalid phone number.', code: 'BAD_REQUEST' });
    }

    // The kiosk matches with ${FACE_MODEL_ID}. A vector from any other extractor lives in a
    // different space, so cosine similarity against the gallery is meaningless — it would
    // enrol a member who can never be recognised. Reject it loudly instead.
    const hasVector = Array.isArray(face_vector) && face_vector.length > 0;
    if (hasVector && face_vector.length !== FACE_EMBEDDING_DIM) {
      return res.status(422).json({
        error:
          `Face vector is ${face_vector.length}-D but the kiosk expects ${FACE_EMBEDDING_DIM}-D from ` +
          `${FACE_MODEL_ID}. The capture step loaded the wrong model — reload the page and try again.`,
        code: 'BAD_REQUEST',
        expectedDimension: FACE_EMBEDDING_DIM,
        expectedModel: FACE_MODEL_ID,
        receivedDimension: face_vector.length,
      });
    }

    const tenantId = parseInt(String(tenant_id), 10);
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant_id', code: 'BAD_REQUEST' });
    }

    // Resolve tenant + check capacity
    const tenant = await getDoc<Tenant>(collections.tenants, tenantId);
    let currentCount = 0;
    let plan: SubscriptionPlan | null = null;

    if (tenant) {
      const existing = await listDocs<Subscriber>(collections.subscribers, [['tenantId', '==', tenantId]]);
      currentCount = existing.length;
    }
    if (plan_id) {
      const planId = parseInt(String(plan_id), 10);
      const candidate = await getDoc<SubscriptionPlan>(collections.subscriptionPlans, planId);
      plan = candidate && candidate.tenantId === tenantId ? candidate : null;
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found', code: 'NOT_FOUND' });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'This organization is currently suspended.', code: 'TENANT_SUSPENDED' });
    }

    const subscriberLimit = tenant.subscriberLimit ?? 100;
    if (currentCount >= subscriberLimit) {
      return res.status(422).json({
        error: `Registration limit of ${subscriberLimit} reached for ${tenant.companyName}. Please contact the front desk.`,
        code: 'LIMIT_EXCEEDED',
        limit: subscriberLimit,
        currentCount,
      });
    }

    // Compute start / end dates from plan
    const durationDays = plan?.durationDays || parseInt(String(req.body.duration_days || '30'), 10);
    const start = new Date();
    const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create subscriber
    const newSubscriber = await createDoc<Subscriber>(collections.subscribers, {
      tenantId,
      name: trimmedName,
      email: email || null,
      phone: phone || null,
      planId: plan_id ? parseInt(String(plan_id), 10) : null,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    } as NewSubscriber);

    // Only store a real capture. Previously a synthetic sine-wave vector was generated
    // when none was supplied, which enrolled a member the kiosk could never match.
    const embeddingRecord = hasVector
      ? await saveFaceEmbedding({
          tenantId,
          subscriberId: newSubscriber.id,
          subscriberName: newSubscriber.name,
          email: newSubscriber.email || '',
          vector: face_vector,
          modelId: FACE_MODEL_ID,
          status: 'active',
        })
      : null;

    const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return res.status(201).json({
      success: true,
      subscriber: {
        id: newSubscriber.id,
        name: newSubscriber.name,
        email: newSubscriber.email,
        phone: newSubscriber.phone,
        tenantId,
        tenantName: tenant.companyName,
        planId: newSubscriber.planId,
        planName: plan?.name || 'Custom Plan',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        daysLeft,
        status: 'active',
      },
      faceEnrolled: embeddingRecord !== null,
      embeddingId: embeddingRecord?.id ?? null,
      vectorDimension: embeddingRecord?.vectorDimension ?? 0,
      modelId: FACE_MODEL_ID,
      message: embeddingRecord
        ? `Welcome to ${tenant.companyName}, ${name}! Your membership is active for ${daysLeft} days.`
        : `${name} was registered at ${tenant.companyName}, but no face was enrolled. ` +
          `They will not be recognised at the kiosk until a face is captured.`,
    });
  } catch (err: any) {
    console.error('[Register] Error:', err);
    res.status(500).json({ error: 'Registration failed', code: 'INTERNAL_ERROR', details: err.message });
  }
});
