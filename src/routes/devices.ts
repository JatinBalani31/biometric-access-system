import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { devices } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';
import { memoryStore } from '../lib/memory-store.ts';
import crypto from 'crypto';

export const devicesRouter = Router();

function generateDeviceToken(tenantId: number, name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `dev_t${tenantId}_${cleanName}_${randomBytes}`;
}

// GET /api/devices - List devices for tenant
devicesRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    try {
      let devList;
      if (tenantId) {
        devList = await db
          .select()
          .from(devices)
          .where(eq(devices.tenantId, tenantId))
          .orderBy(devices.id);
      } else {
        devList = await db.select().from(devices).orderBy(devices.id);
      }
      return res.json(devList);
    } catch (dbErr) {
      const filtered = memoryStore.devices.filter((d) => !tenantId || d.tenantId === tenantId);
      return res.json(filtered);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch devices', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/devices - Register new kiosk device
devicesRouter.post('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });

    const { device_name } = req.body;
    if (!device_name) return res.status(400).json({ error: 'device_name is required', code: 'BAD_REQUEST' });

    const token = generateDeviceToken(tenantId, device_name);

    try {
      const [newDevice] = await db
        .insert(devices)
        .values({
          tenantId,
          deviceName: device_name,
          deviceToken: token,
          status: 'active',
        })
        .returning();

      return res.status(201).json({
        message: 'Device registered successfully',
        device: newDevice,
        apiKeyInstructions: {
          header: 'x-device-token',
          bearerFormat: `Authorization: Bearer ${token}`,
        },
      });
    } catch (dbErr) {
      const newDevice = {
        id: memoryStore.devices.length + 1,
        tenantId,
        deviceName: device_name,
        deviceToken: token,
        status: 'active',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
      };
      memoryStore.devices.push(newDevice);
      return res.status(201).json({
        message: 'Device registered successfully',
        device: newDevice,
        apiKeyInstructions: {
          header: 'x-device-token',
          bearerFormat: `Authorization: Bearer ${token}`,
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register device', code: 'INTERNAL_ERROR' });
  }
});
