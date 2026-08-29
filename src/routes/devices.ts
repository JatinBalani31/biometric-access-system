import { Router, Response, Request } from 'express';
import { createDoc, getDoc, updateDoc, listDocs, findOne, collections } from '../db/firestore.ts';
import { Device, Tenant } from '../db/models.ts';
import { AuthenticatedRequest, requireTenantAdminOrCompany, resolveTenantId } from '../middleware/auth.ts';
import crypto from 'crypto';

export const devicesRouter = Router();

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateDeviceToken(tenantId: number, name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `dev_t${tenantId}_${cleanName}_${randomBytes}`;
}

/** 6-digit numeric code — short enough to read off a screen and type on a kiosk. */
function generatePairingCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// GET /api/devices - List devices for tenant
devicesRouter.get('/', requireTenantAdminOrCompany, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    const devList = tenantId
      ? await listDocs<Device>(collections.devices, [['tenantId', '==', tenantId]])
      : await listDocs<Device>(collections.devices);
    devList.sort((a, b) => a.id - b.id);

    return res.json(devList);
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

    const newDevice = await createDoc<Device>(collections.devices, {
      tenantId,
      deviceName: device_name,
      deviceToken: token,
      status: 'active',
      lastSyncedAt: null,
      createdAt: new Date().toISOString(),
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    return res.status(201).json({
      message: 'Device registered successfully',
      device: newDevice,
      apiKeyInstructions: {
        header: 'x-device-token',
        bearerFormat: `Authorization: Bearer ${token}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register device', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/devices/generate-pairing-code - Admin: mint a short-lived code a new
// kiosk can be paired with, instead of hand-copying a device token into local.properties.
devicesRouter.post(
  '/generate-pairing-code',
  requireTenantAdminOrCompany,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });

      const { device_name } = req.body;
      if (!device_name) return res.status(400).json({ error: 'device_name is required', code: 'BAD_REQUEST' });

      const token = generateDeviceToken(tenantId, device_name);
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

      const newDevice = await createDoc<Device>(collections.devices, {
        tenantId,
        deviceName: device_name,
        deviceToken: token,
        status: 'pending',
        lastSyncedAt: null,
        createdAt: new Date().toISOString(),
        pairingCode: code,
        pairingCodeExpiresAt: expiresAt.toISOString(),
      });

      return res.status(201).json({
        device: newDevice,
        pairingCode: code,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate pairing code', code: 'INTERNAL_ERROR' });
    }
  }
);

// POST /api/devices/pair - Public: a freshly-installed kiosk exchanges a pairing code
// (typed in by whoever is setting it up) for its permanent device token. No auth header
// required — the short-lived, single-use code IS the credential for this one exchange.
devicesRouter.post('/pair', async (req: Request, res: Response) => {
  try {
    const { pairing_code } = req.body;
    if (!pairing_code || typeof pairing_code !== 'string') {
      return res.status(400).json({ error: 'pairing_code is required', code: 'BAD_REQUEST' });
    }
    const code = pairing_code.trim();

    // Query on pairingCode alone (single-field index, no composite index needed) —
    // status/expiry are checked in application code below.
    const candidate = await findOne<Device>(collections.devices, 'pairingCode', code);
    const matched =
      candidate &&
      candidate.status === 'pending' &&
      candidate.pairingCodeExpiresAt &&
      new Date(candidate.pairingCodeExpiresAt).getTime() > Date.now()
        ? candidate
        : null;

    if (!matched) {
      return res.status(404).json({
        error: 'Invalid or expired pairing code',
        code: 'INVALID_PAIRING_CODE',
      });
    }

    await updateDoc(collections.devices, matched.id, {
      status: 'active',
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    const tenant = await getDoc<Tenant>(collections.tenants, matched.tenantId);

    res.json({
      success: true,
      device_token: matched.deviceToken,
      tenant_id: matched.tenantId,
      tenant_name: tenant?.companyName || '',
      device_name: matched.deviceName,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Pairing failed', code: 'INTERNAL_ERROR', details: error.message });
  }
});
