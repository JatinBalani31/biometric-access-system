import { Router, Response, Request } from 'express';
import { createDoc, getDoc, updateDoc, listDocs, findOne, setDoc, collections } from '../db/firestore.ts';
import { Device, DeviceSecret, Tenant } from '../db/models.ts';
import { AuthenticatedRequest, requireTenantPermission, resolveTenantId } from '../middleware/auth.ts';
import { logAuditAction } from '../lib/audit-logger.ts';
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
devicesRouter.get('/', requireTenantPermission('devices', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId && req.auth?.role !== 'company_admin') {
      return res.status(403).json({ error: 'Tenant context required', code: 'FORBIDDEN' });
    }

    const devList = tenantId
      ? await listDocs<Device>(collections.devices, [['tenantId', '==', tenantId]])
      : await listDocs<Device>(collections.devices);
    devList.sort((a, b) => a.id - b.id);

    return res.json(devList.map(({ deviceToken, pairingCode, pairingCodeExpiresAt, ...device }) => device));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch devices', code: 'INTERNAL_ERROR', details: error.message });
  }
});

// POST /api/devices - Register new kiosk device
devicesRouter.post('/', requireTenantPermission('devices', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenant_id is required', code: 'BAD_REQUEST' });

    const { device_name } = req.body;
    if (!device_name) return res.status(400).json({ error: 'device_name is required', code: 'BAD_REQUEST' });

    const token = generateDeviceToken(tenantId, device_name);

    const newDevice = await createDoc<Device>(collections.devices, {
      tenantId,
      deviceName: device_name,
      status: 'active',
      lastSyncedAt: null,
      createdAt: new Date().toISOString(),
    });
      await setDoc<DeviceSecret>(collections.deviceSecrets, newDevice.id, {
        id: newDevice.id,
        tenantId,
        deviceToken: token,
        pairingCode: null,
        pairingCodeExpiresAt: null,
      });

    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'DEVICE_REGISTERED',
      tenantId,
      targetType: 'device',
      targetId: String(newDevice.id),
      newState: { deviceName: newDevice.deviceName, status: newDevice.status },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Device registered successfully',
      device: newDevice,
      deviceToken: token,
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
  requireTenantPermission('devices', 'create'),
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
        status: 'pending',
        lastSyncedAt: null,
        createdAt: new Date().toISOString(),
      });
      await setDoc<DeviceSecret>(collections.deviceSecrets, newDevice.id, {
        id: newDevice.id,
        tenantId,
        deviceToken: token,
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

devicesRouter.patch('/:id', requireTenantPermission('devices', 'update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<Device>(collections.devices, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Device not found', code: 'NOT_FOUND' });
    }

    const updates: Record<string, unknown> = {};
    const { device_name, status } = req.body;
    if (device_name !== undefined) {
      if (typeof device_name !== 'string' || !device_name.trim() || device_name.trim().length > 100) {
        return res.status(400).json({ error: 'device_name must be 1-100 characters', code: 'BAD_REQUEST' });
      }
      updates.deviceName = device_name.trim();
    }
    if (status !== undefined) {
      if (!['active', 'maintenance'].includes(status)) {
        return res.status(400).json({ error: 'status must be active or maintenance', code: 'BAD_REQUEST' });
      }
      updates.status = status;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No supported fields to update', code: 'BAD_REQUEST' });
    }

    await updateDoc(collections.devices, id, updates);
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'DEVICE_UPDATED',
      tenantId: current.tenantId,
      targetType: 'device',
      targetId: String(id),
      previousState: current,
      newState: updates,
      ipAddress: req.ip,
    });
    const { deviceToken, pairingCode, pairingCodeExpiresAt, ...safeCurrent } = current;
    return res.json({ ...safeCurrent, ...updates });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update device', code: 'INTERNAL_ERROR', details: error.message });
  }
});

devicesRouter.delete('/:id', requireTenantPermission('devices', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const tenantId = resolveTenantId(req);
    const current = await getDoc<Device>(collections.devices, id);
    if (!current || (tenantId !== null && current.tenantId !== tenantId)) {
      return res.status(404).json({ error: 'Device not found', code: 'NOT_FOUND' });
    }

    await updateDoc(collections.devices, id, { status: 'revoked' });
    const secret = await getDoc<DeviceSecret>(collections.deviceSecrets, id);
    if (secret) {
      await updateDoc(collections.deviceSecrets, id, { pairingCode: null, pairingCodeExpiresAt: null });
    }
    await logAuditAction({
      actorEmail: req.auth?.email ?? 'unknown',
      actorRole: req.auth?.tenantRole ?? req.auth?.role,
      action: 'DEVICE_REVOKED',
      tenantId: current.tenantId,
      targetType: 'device',
      targetId: String(id),
      previousState: { status: current.status, deviceName: current.deviceName },
      newState: { status: 'revoked' },
      ipAddress: req.ip,
    });
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to revoke device', code: 'INTERNAL_ERROR', details: error.message });
  }
});

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
    const secret = await findOne<DeviceSecret>(collections.deviceSecrets, 'pairingCode', code);
    const legacyCandidate = secret ? null : await findOne<Device>(collections.devices, 'pairingCode', code);
    const candidate = secret ? await getDoc<Device>(collections.devices, secret.id) : legacyCandidate;
    const pairingExpiry = secret?.pairingCodeExpiresAt ?? candidate?.pairingCodeExpiresAt;
    const matched = candidate && candidate.status === 'pending' && pairingExpiry && new Date(pairingExpiry).getTime() > Date.now()
      ? candidate
      : null;

    if (!matched) {
      return res.status(404).json({
        error: 'Invalid or expired pairing code',
        code: 'INVALID_PAIRING_CODE',
      });
    }

    await updateDoc(collections.devices, matched.id, { status: 'active' });
    const deviceSecret = secret ?? await getDoc<DeviceSecret>(collections.deviceSecrets, matched.id);
    if (deviceSecret) {
      await updateDoc(collections.deviceSecrets, matched.id, { pairingCode: null, pairingCodeExpiresAt: null });
    }

    const tenant = await getDoc<Tenant>(collections.tenants, matched.tenantId);
    const secretAfterPair = deviceSecret ?? await getDoc<DeviceSecret>(collections.deviceSecrets, matched.id);
    const deviceToken = secretAfterPair?.deviceToken ?? matched.deviceToken;
    if (!deviceToken) {
      return res.status(500).json({ error: 'Device credential is unavailable', code: 'DEVICE_SECRET_MISSING' });
    }

    res.json({
      success: true,
      device_token: deviceToken,
      tenant_id: matched.tenantId,
      tenant_name: tenant?.companyName || '',
      device_name: matched.deviceName,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Pairing failed', code: 'INTERNAL_ERROR', details: error.message });
  }
});
