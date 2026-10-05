import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.FIREBASE_PROJECT_ID = 'demo-biometric-access-system';
process.env.ALLOW_SIMULATED_AUTH = 'true';

const [{ createApp }, { adminDb }] = await Promise.all([
  import('../src/app.ts'),
  import('../src/lib/firebase-admin.ts'),
]);

const seedCollections = ['tenants', 'subscribers', 'subscription_plans', 'devices', 'device_secrets', 'audit_logs', '_counters'];
let server: Server;

async function resetFixtures() {
  for (const name of seedCollections) {
    const snapshot = await adminDb.collection(name).get();
    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
    }
  }

  const createdAt = '2026-01-01T00:00:00.000Z';
  const endDate = '2030-01-01T00:00:00.000Z';
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc('1'), {
    id: 1, companyName: 'Tenant One', contactEmail: 'one@example.test', planTier: 'starter', subscriberLimit: 10, status: 'active', createdAt,
  });
  batch.set(adminDb.collection('tenants').doc('2'), {
    id: 2, companyName: 'Tenant Two', contactEmail: 'two@example.test', planTier: 'pro', subscriberLimit: 20, status: 'active', createdAt,
  });
  batch.set(adminDb.collection('subscribers').doc('101'), {
    id: 101, tenantId: 1, name: 'A Member', email: 'a@example.test', phone: null, planId: 11, startDate: createdAt, endDate, status: 'active', createdAt,
  });
  batch.set(adminDb.collection('subscribers').doc('202'), {
    id: 202, tenantId: 2, name: 'B Member', email: 'b@example.test', phone: null, planId: 22, startDate: createdAt, endDate, status: 'active', createdAt,
  });
  batch.set(adminDb.collection('subscription_plans').doc('11'), {
    id: 11, tenantId: 1, name: 'A Plan', durationDays: 30, price: '10.00', createdAt,
  });
  batch.set(adminDb.collection('subscription_plans').doc('22'), {
    id: 22, tenantId: 2, name: 'B Plan', durationDays: 30, price: '20.00', createdAt,
  });
  batch.set(adminDb.collection('devices').doc('21'), {
    id: 21, tenantId: 1, deviceName: 'A Kiosk', status: 'active', lastSyncedAt: null, createdAt,
  });
  batch.set(adminDb.collection('devices').doc('22'), {
    id: 22, tenantId: 2, deviceName: 'B Kiosk', status: 'active', lastSyncedAt: null, createdAt,
  });
  batch.set(adminDb.collection('device_secrets').doc('21'), {
    id: 21, tenantId: 1, deviceToken: 'device-token-tenant-a-abcdefghijklmnopqrstuvwxyz',
  });
  batch.set(adminDb.collection('device_secrets').doc('22'), {
    id: 22, tenantId: 2, deviceToken: 'device-token-tenant-b-abcdefghijklmnopqrstuvwxyz',
  });
  batch.set(adminDb.collection('audit_logs').doc('301'), {
    id: 301, tenantId: 1, tenantName: 'Tenant One', actorEmail: 'owner@one.test', actorRole: 'owner', action: 'SUBSCRIBER_REGISTERED', targetType: 'subscriber', targetId: '101', previousState: null, newState: null, ipAddress: '127.0.0.1', createdAt,
  });
  batch.set(adminDb.collection('audit_logs').doc('302'), {
    id: 302, tenantId: 2, tenantName: 'Tenant Two', actorEmail: 'owner@two.test', actorRole: 'owner', action: 'SUBSCRIBER_REGISTERED', targetType: 'subscriber', targetId: '202', previousState: null, newState: null, ipAddress: '127.0.0.1', createdAt,
  });
  batch.set(adminDb.collection('_counters').doc('subscribers'), { value: 1000 });
  await batch.commit();
}

async function requestApi(path: string, options: RequestInit = {}, tenantRole = 'owner') {
  const port = (server.address() as AddressInfo).port;
  const headers = new Headers(options.headers);
  headers.set('x-simulated-role', 'tenant_admin');
  headers.set('x-simulated-tenant-id', '1');
  headers.set('x-simulated-tenant-role', tenantRole);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  return fetch(`http://127.0.0.1:${port}${path}`, { ...options, headers });
}

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
});

beforeEach(resetFixtures);

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('tenant API isolation and role permissions', () => {
  it('lists only the tenant in the signed tenant context', async () => {
    const response = await requestApi('/api/subscribers?tenant_id=2');
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.data.map((row: any) => row.tenantId), [1]);
  });

  it('hides foreign subscriber, plan, and device records on ID-based operations', async () => {
    for (const [method, path, body] of [
      ['GET', '/api/subscribers/202', undefined],
      ['PATCH', '/api/subscribers/202', { name: 'changed' }],
      ['DELETE', '/api/subscribers/202', undefined],
      ['PATCH', '/api/plans/22', { name: 'changed' }],
      ['DELETE', '/api/plans/22', undefined],
      ['PATCH', '/api/devices/22', { device_name: 'changed' }],
      ['DELETE', '/api/devices/22', undefined],
    ] as const) {
      const response = await requestApi(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, 404, `${method} ${path}`);
    }
  });

  it('uses the claim tenant instead of a forged request tenant when creating a member', async () => {
    const response = await requestApi('/api/subscribers', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Member', tenant_id: 2 }),
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.tenantId, 1);
    assert.equal((await adminDb.collection('subscribers').doc(String(body.id)).get()).data()?.tenantId, 1);
  });

  it('allows front desk to manage members but denies plan/device administration', async () => {
    const addMember = await requestApi('/api/subscribers', {
      method: 'POST', body: JSON.stringify({ name: 'Front Desk Member' }),
    }, 'front-desk');
    const addPlan = await requestApi('/api/plans', {
      method: 'POST', body: JSON.stringify({ name: 'Forbidden Plan' }),
    }, 'front-desk');
    const addDevice = await requestApi('/api/devices', {
      method: 'POST', body: JSON.stringify({ device_name: 'Forbidden Kiosk' }),
    }, 'front-desk');
    assert.equal(addMember.status, 201);
    assert.equal(addPlan.status, 403);
    assert.equal(addDevice.status, 403);
  });

  it('keeps auditors read-only and scopes activity to their tenant', async () => {
    const members = await requestApi('/api/subscribers', {}, 'read-only-auditor');
    const activity = await requestApi('/api/tenants/me/activity', {}, 'read-only-auditor');
    const update = await requestApi('/api/subscribers/101', {
      method: 'PATCH', body: JSON.stringify({ name: 'Not allowed' }),
    }, 'read-only-auditor');
    const remove = await requestApi('/api/subscribers/101', { method: 'DELETE' }, 'read-only-auditor');
    const activityBody = await activity.json();
    assert.equal(members.status, 200);
    assert.equal(activity.status, 200);
    assert.deepEqual(activityBody.logs.map((entry: any) => entry.tenantId), [1]);
    assert.equal(update.status, 403);
    assert.equal(remove.status, 403);
  });

  it('denies front desk access to organization activity', async () => {
    const response = await requestApi('/api/tenants/me/activity', {}, 'front-desk');
    assert.equal(response.status, 403);
  });
});