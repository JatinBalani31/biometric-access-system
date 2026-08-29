import { Router, Response } from 'express';
import { collections, createDoc, listDocs } from '../db/firestore.ts';
import { SubscriptionPlan, NewSubscriptionPlan } from '../db/models.ts';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';

export const plansRouter = Router();

// GET /api/plans - List subscription plans (filtered strictly by tenant_id)
plansRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
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
plansRouter.post('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
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
    return res.status(201).json(newPlan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create plan', code: 'INTERNAL_ERROR' });
  }
});
