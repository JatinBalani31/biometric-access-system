import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { subscriptionPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';
import { memoryStore } from '../lib/memory-store.ts';

export const plansRouter = Router();

// GET /api/plans - List subscription plans (filtered strictly by tenant_id)
plansRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    try {
      let plans;
      if (tenantId) {
        plans = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.tenantId, tenantId))
          .orderBy(subscriptionPlans.id);
      } else {
        plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.id);
      }
      return res.json(plans);
    } catch (dbErr) {
      const filtered = memoryStore.subscriptionPlans.filter((p) => !tenantId || p.tenantId === tenantId);
      return res.json(filtered);
    }
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

    try {
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({
          tenantId,
          name,
          durationDays: parseInt(duration_days, 10) || 30,
          price: String(price),
        })
        .returning();
      return res.status(201).json(newPlan);
    } catch (dbErr) {
      const newPlan = {
        id: memoryStore.subscriptionPlans.length + 1,
        tenantId,
        name,
        durationDays: parseInt(duration_days, 10) || 30,
        price: String(price),
        createdAt: new Date(),
      };
      memoryStore.subscriptionPlans.push(newPlan);
      return res.status(201).json(newPlan);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create plan', code: 'INTERNAL_ERROR' });
  }
});
