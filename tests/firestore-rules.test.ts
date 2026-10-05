import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { tenantPermissionMatrix, tenantRoles, TenantResource } from '../src/lib/permissions.ts';

const resourceCollections: Record<TenantResource, string> = {
  profile: 'tenants',
  subscribers: 'subscribers',
  plans: 'subscription_plans',
  offerings: 'offerings',
  devices: 'devices',
  activity: 'audit_logs',
  biometrics: 'face_embeddings',
};

function fixture(resource: TenantResource, id: number, tenantId = 1): Record<string, any> {
  const createdAt = '2026-01-01T00:00:00.000Z';
  if (resource === 'profile') {
    return { id, companyName: 'Tenant One', contactEmail: 'one@example.test', planTier: 'starter', subscriberLimit: 50, status: 'active', createdAt };
  }
  if (resource === 'subscribers') {
    return { id, tenantId, name: 'Member One', email: 'member@example.test', phone: null, planId: null, startDate: createdAt, endDate: createdAt, status: 'active', createdAt };
  }
  if (resource === 'plans') {
    return { id, tenantId, name: 'Monthly', durationDays: 30, price: '10.00', createdAt };
  }
  if (resource === 'offerings') {
    return {
      id, tenantId, name: 'Monthly access', description: '', kind: 'membership', priceMinor: 1000,
      currency: 'INR', active: true, period: { kind: 'monthly' }, capacityLimit: null, timezone: 'UTC',
      maxEntriesPerDay: null, duplicateWindowMinutes: 2, slots: [], createdAt, updatedAt: createdAt,
    };
  }
  if (resource === 'devices') {
    return { id, tenantId, deviceName: 'Reception', status: 'active', lastSyncedAt: null, createdAt };
  }
  if (resource === 'activity') {
    return { id, tenantId, actorEmail: 'owner@example.test', actorRole: 'owner', action: 'SUBSCRIBER_REGISTERED', targetType: 'subscriber', targetId: String(id), previousState: null, newState: null, ipAddress: '127.0.0.1', createdAt };
  }
  return { id: `tenant_${tenantId}_sub_${id}`, tenantId, subscriberId: id, subscriberName: 'Member One', email: 'member@example.test', vector: Array.from({ length: 192 }, () => 0.01), vectorDimension: 192, modelId: 'mobilefacenet_112_v1', status: 'active', updatedAt: createdAt, createdAt };
}

function changed(resource: TenantResource): Record<string, string> {
  if (resource === 'profile') return { companyName: 'Updated Tenant' };
  if (resource === 'subscribers') return { name: 'Updated Member' };
  if (resource === 'plans') return { name: 'Updated Plan' };
  if (resource === 'offerings') return { name: 'Updated Offering' };
  if (resource === 'devices') return { deviceName: 'Updated Device' };
  if (resource === 'activity') return { action: 'CHANGED' };
  return { subscriberName: 'Updated Member', updatedAt: '2026-01-02T00:00:00.000Z' };
}

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-biometric-access-system',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe('Firestore role matrix', () => {
  for (const role of tenantRoles) {
    for (const resource of Object.keys(resourceCollections) as TenantResource[]) {
      it(`${role} permissions for ${resource} match the shared matrix`, async () => {
        await testEnv.clearFirestore();
        const collectionName = resourceCollections[resource];
        const existingId = resource === 'biometrics' ? `tenant_1_sub_${role}` : `doc_${role}`;
        const createdId = `new_${role}_${resource}`;
        const existingData = fixture(resource, resource === 'profile' ? 1 : 100 + tenantRoles.indexOf(role));
        const newData = fixture(resource, 900 + tenantRoles.indexOf(role));
        const pathId = resource === 'profile' ? String(existingData.id) : existingId;

        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), collectionName, pathId), existingData);
        });

        const db = testEnv.authenticatedContext(`user-${role}`, {
          role: 'tenant_admin',
          tenantId: 1,
          tenantRole: role,
        }).firestore();
        const existingRef = doc(db, collectionName, pathId);
        const createdRef = doc(db, collectionName, createdId);
        const permissions = tenantPermissionMatrix[role][resource];

        if (permissions.read) await assertSucceeds(getDoc(existingRef));
        else await assertFails(getDoc(existingRef));

        if (permissions.create) await assertSucceeds(setDoc(createdRef, newData));
        else await assertFails(setDoc(createdRef, newData));

        if (permissions.update) await assertSucceeds(updateDoc(existingRef, changed(resource)));
        else await assertFails(updateDoc(existingRef, changed(resource)));

        if (permissions.delete) await assertSucceeds(deleteDoc(existingRef));
        else await assertFails(deleteDoc(existingRef));
      });
    }
  }

  it('denies tenant A reads and writes to tenant B, and requires tenant-filtered lists', async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'subscribers', 'tenant-a'), fixture('subscribers', 101, 1));
      await setDoc(doc(db, 'subscribers', 'tenant-b'), fixture('subscribers', 202, 2));
      await setDoc(doc(db, 'device_secrets', '21'), { id: 21, tenantId: 1, deviceToken: 'private-device-token' });
    });

    const db = testEnv.authenticatedContext('tenant-a-owner', {
      role: 'tenant_admin', tenantId: 1, tenantRole: 'owner',
    }).firestore();
    await assertSucceeds(getDoc(doc(db, 'subscribers', 'tenant-a')));
    await assertFails(getDoc(doc(db, 'subscribers', 'tenant-b')));
    await assertFails(getDoc(doc(db, 'device_secrets', '21')));
    await assertFails(updateDoc(doc(db, 'subscribers', 'tenant-a'), { tenantId: 2 }));
    await assertFails(setDoc(doc(db, 'subscribers', 'forged-tenant-b'), fixture('subscribers', 303, 2)));
    await assertFails(getDocs(collection(db, 'subscribers')));

    const ownTenant = await assertSucceeds(getDocs(query(collection(db, 'subscribers'), where('tenantId', '==', 1))));
    assert.equal(ownTenant.size, 1);
  });

  it('denies all access when tenant role claims are missing', async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'subscribers', 'one'), fixture('subscribers', 1));
    });
    const db = testEnv.authenticatedContext('missing-role', { role: 'tenant_admin', tenantId: 1 }).firestore();
    await assertFails(getDoc(doc(db, 'subscribers', 'one')));
    await assertFails(setDoc(doc(db, 'subscribers', 'two'), fixture('subscribers', 2)));
  });
});