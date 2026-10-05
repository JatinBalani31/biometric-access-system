import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CheckInInput, evaluateCheckIn } from '../src/lib/check-in.ts';
import { Offering, TenantType, createOfferingTemplate, tenantTypeConfig, validateOfferingConfig } from '../src/lib/tenant-product.ts';

const now = new Date('2026-10-05T10:00:00.000Z');

function offeringFor(type: TenantType): Offering {
  return {
    id: 7,
    tenantId: 1,
    name: `${type} access`,
    description: '',
    kind: tenantTypeConfig[type].defaultOfferingKind,
    priceMinor: 1000,
    currency: 'INR',
    active: true,
    period: { kind: 'monthly' },
    capacityLimit: 100,
    timezone: 'UTC',
    maxEntriesPerDay: 4,
    duplicateWindowMinutes: 2,
    slots: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function input(type: TenantType): CheckInInput {
  return {
    member: { id: 9, status: 'active', startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-11-01T00:00:00.000Z', offeringIds: [7] },
    offering: offeringFor(type),
    device: { status: 'active' },
    timestamp: now,
  };
}

describe('configuration-driven check-in evaluation', () => {
  it('configures gym, mess, and class offerings without type-specific evaluator branches', () => {
    assert.deepEqual(
      (['gym', 'mess', 'class'] as const).map((type) => evaluateCheckIn(input(type)).reason),
      ['allowed', 'allowed', 'allowed'],
    );
    for (const type of ['gym', 'mess', 'class'] as const) {
      const template = { ...createOfferingTemplate(type, now.toISOString()), name: `${type} example` };
      assert.deepEqual(validateOfferingConfig(template), []);
    }
  });

  it('denies expired access', () => {
    const request = input('gym');
    request.member.endsAt = '2026-10-05T09:59:59.000Z';
    assert.equal(evaluateCheckIn(request).reason, 'expired');
  });

  it('denies capacity when the configured limit is full', () => {
    const request = input('mess');
    request.offering.capacityLimit = 3;
    request.activeEnrollmentCount = 3;
    assert.equal(evaluateCheckIn(request).reason, 'capacity_full');
  });

  it('denies check-in outside a configured class slot', () => {
    const request = input('class');
    request.offering.slots = [{ id: 'mon-am', label: 'Monday class', weekdays: [1], startTime: '08:00', endTime: '09:00', capacityLimit: 12 }];
    assert.equal(evaluateCheckIn(request).reason, 'outside_time_window');
  });

  it('denies duplicate entries inside the duplicate window', () => {
    const request = input('gym');
    request.history = [{ checkedInAt: '2026-10-05T09:59:00.000Z' }];
    assert.equal(evaluateCheckIn(request).reason, 'duplicate_entry');
  });

  it('denies the daily limit, slot limit, inactive device, and non-enrolled members', () => {
    const daily = input('gym');
    daily.offering.maxEntriesPerDay = 1;
    daily.history = [{ checkedInAt: '2026-10-05T08:00:00.000Z' }];
    assert.equal(evaluateCheckIn(daily).reason, 'daily_limit_reached');

    const slot = input('class');
    slot.offering.slots = [{ id: 'mon', label: 'Monday', weekdays: [1], startTime: '09:00', endTime: '11:00', capacityLimit: 2 }];
    slot.activeSlotCount = 2;
    assert.equal(evaluateCheckIn(slot).reason, 'capacity_full');

    const inactive = input('mess');
    inactive.device.status = 'revoked';
    assert.equal(evaluateCheckIn(inactive).reason, 'device_inactive');

    const notEnrolled = input('class');
    notEnrolled.member.offeringIds = [];
    assert.equal(evaluateCheckIn(notEnrolled).reason, 'not_enrolled');
  });
});