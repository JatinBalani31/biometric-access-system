import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTenant, tenantPermissionMatrix, tenantRoles } from '../src/lib/permissions.ts';

describe('tenant permission matrix', () => {
  it('grants owner full tenant resource management but not profile deletion', () => {
    for (const resource of ['subscribers', 'plans', 'offerings', 'devices', 'biometrics'] as const) {
      for (const action of ['read', 'create', 'update', 'delete'] as const) {
        assert.equal(canTenant('owner', resource, action), true);
      }
    }
    assert.equal(canTenant('owner', 'profile', 'delete'), false);
  });

  it('keeps auditor read-only and front desk focused on members', () => {
    for (const resource of ['subscribers', 'plans', 'offerings', 'devices', 'activity'] as const) {
      assert.equal(canTenant('read-only-auditor', resource, 'read'), true);
      for (const action of ['create', 'update', 'delete'] as const) {
        assert.equal(canTenant('read-only-auditor', resource, action), false);
      }
    }
    assert.equal(canTenant('front-desk', 'subscribers', 'create'), true);
    assert.equal(canTenant('front-desk', 'plans', 'update'), false);
    assert.equal(canTenant('front-desk', 'activity', 'read'), false);
    assert.equal(canTenant('front-desk', 'biometrics', 'read'), false);
    assert.equal(canTenant('read-only-auditor', 'biometrics', 'read'), false);
    assert.equal(canTenant('read-only-auditor', 'biometrics', 'update'), false);
  });

  it('defines a complete matrix for every tenant role and resource', () => {
    assert.deepEqual(tenantRoles, ['owner', 'manager', 'front-desk', 'read-only-auditor']);
    for (const role of tenantRoles) {
      for (const resource of ['profile', 'subscribers', 'plans', 'offerings', 'devices', 'activity', 'biometrics'] as const) {
        for (const action of ['read', 'create', 'update', 'delete'] as const) {
          assert.equal(typeof tenantPermissionMatrix[role][resource][action], 'boolean');
        }
      }
    }
  });
});