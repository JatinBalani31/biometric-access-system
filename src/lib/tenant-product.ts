export const tenantTypes = ['gym', 'mess', 'class'] as const;
export type TenantType = (typeof tenantTypes)[number];

export interface TenantLabels {
  customerSingular: string;
  customerPlural: string;
  offeringSingular: string;
  offeringPlural: string;
}

export interface TenantTypeConfig {
  labels: TenantLabels;
  defaultOfferingKind: OfferingKind;
}

export const tenantTypeConfig: Record<TenantType, TenantTypeConfig> = {
  gym: {
    labels: { customerSingular: 'member', customerPlural: 'members', offeringSingular: 'membership', offeringPlural: 'memberships' },
    defaultOfferingKind: 'membership',
  },
  mess: {
    labels: { customerSingular: 'diner', customerPlural: 'diners', offeringSingular: 'meal plan', offeringPlural: 'meal plans' },
    defaultOfferingKind: 'meal-plan',
  },
  class: {
    labels: { customerSingular: 'student', customerPlural: 'students', offeringSingular: 'course', offeringPlural: 'courses' },
    defaultOfferingKind: 'class-course',
  },
};

export type OfferingKind = 'membership' | 'meal-plan' | 'class-course';
export type PeriodKind = 'monthly' | 'quarterly' | 'custom';

export interface OfferingPeriod {
  kind: PeriodKind;
  customDays?: number;
}

export interface OfferingSlot {
  id: string;
  label: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  capacityLimit?: number | null;
}

export interface Offering {
  id: number;
  tenantId: number;
  legacyPlanId?: number;
  migrationId?: string;
  name: string;
  description: string;
  kind: OfferingKind;
  priceMinor: number;
  currency: string;
  active: boolean;
  period: OfferingPeriod;
  capacityLimit: number | null;
  timezone: string;
  maxEntriesPerDay: number | null;
  duplicateWindowMinutes: number;
  slots: OfferingSlot[];
  mealsPerDay?: number;
  mealSlotIds?: string[];
  skipRules?: {
    cutoffMinutes: number;
    maxSkipsPerPeriod: number;
  };
  enrollmentLimit?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type NewOffering = Omit<Offering, 'id'>;

export function createOfferingTemplate(tenantType: TenantType, now = new Date().toISOString()): Omit<Offering, 'id' | 'tenantId'> {
  const kind = tenantTypeConfig[tenantType].defaultOfferingKind;
  return {
    name: '',
    description: '',
    kind,
    priceMinor: 0,
    currency: 'INR',
    active: true,
    period: { kind: 'monthly' },
    capacityLimit: null,
    timezone: 'Asia/Kolkata',
    maxEntriesPerDay: null,
    duplicateWindowMinutes: 2,
    slots: [],
    ...(kind === 'meal-plan' ? { mealsPerDay: 1, mealSlotIds: [], skipRules: { cutoffMinutes: 0, maxSkipsPerPeriod: 0 } } : {}),
    ...(kind === 'class-course' ? { enrollmentLimit: null } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

export function validateOfferingConfig(value: unknown): string[] {
  if (!value || typeof value !== 'object') return ['Offering configuration is required.'];
  const offering = value as Partial<Offering>;
  const errors: string[] = [];

  if (typeof offering.name !== 'string' || !offering.name.trim() || offering.name.trim().length > 100) {
    errors.push('Name must be 1-100 characters.');
  }
  if (typeof offering.description !== 'string' || offering.description.length > 1000) {
    errors.push('Description must be at most 1000 characters.');
  }
  if (!['membership', 'meal-plan', 'class-course'].includes(String(offering.kind))) {
    errors.push('Offering kind must be membership, meal-plan, or class-course.');
  }
  if (!Number.isSafeInteger(offering.priceMinor) || (offering.priceMinor ?? -1) < 0) {
    errors.push('Price must be a non-negative integer in minor currency units.');
  }
  if (typeof offering.currency !== 'string' || !/^[A-Z]{3}$/.test(offering.currency)) {
    errors.push('Currency must be a three-letter uppercase code.');
  }
  if (!offering.period || !['monthly', 'quarterly', 'custom'].includes(offering.period.kind)) {
    errors.push('Period must be monthly, quarterly, or custom.');
  } else if (offering.period.kind === 'custom' && (!Number.isInteger(offering.period.customDays) || (offering.period.customDays ?? 0) < 1 || (offering.period.customDays ?? 0) > 3650)) {
    errors.push('Custom periods must be between 1 and 3650 days.');
  }
  if (offering.capacityLimit !== null && (!Number.isInteger(offering.capacityLimit) || (offering.capacityLimit ?? 0) < 1)) {
    errors.push('Capacity must be null or a positive integer.');
  }
  if (offering.maxEntriesPerDay !== null && (!Number.isInteger(offering.maxEntriesPerDay) || (offering.maxEntriesPerDay ?? 0) < 1)) {
    errors.push('Daily entry limit must be null or a positive integer.');
  }
  if (!Number.isInteger(offering.duplicateWindowMinutes) || (offering.duplicateWindowMinutes ?? -1) < 0 || (offering.duplicateWindowMinutes ?? 0) > 1440) {
    errors.push('Duplicate window must be between 0 and 1440 minutes.');
  }
  if (typeof offering.timezone !== 'string' || offering.timezone.length > 64) {
    errors.push('A valid time zone is required.');
  } else {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: offering.timezone });
    } catch {
      errors.push('A valid IANA time zone is required.');
    }
  }
  if (!Array.isArray(offering.slots) || offering.slots.length > 50) {
    errors.push('Schedules must contain at most 50 slots.');
  } else {
    const ids = new Set<string>();
    for (const slot of offering.slots) {
      if (!slot || typeof slot.id !== 'string' || !slot.id || slot.id.length > 40 || ids.has(slot.id)) {
        errors.push('Schedule slot IDs must be unique strings of 1-40 characters.');
        continue;
      }
      ids.add(slot.id);
      if (typeof slot.label !== 'string' || !slot.label.trim() || slot.label.length > 80) errors.push(`Slot ${slot.id} needs a label of at most 80 characters.`);
      if (!Array.isArray(slot.weekdays) || slot.weekdays.length < 1 || slot.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
        errors.push(`Slot ${slot.id} needs weekdays from 0 (Sunday) through 6 (Saturday).`);
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime)) {
        errors.push(`Slot ${slot.id} needs valid 24-hour start and end times.`);
      }
      if (slot.capacityLimit != null && (!Number.isInteger(slot.capacityLimit) || slot.capacityLimit < 1)) {
        errors.push(`Slot ${slot.id} capacity must be a positive integer or null.`);
      }
    }
  }
  if (offering.kind === 'meal-plan') {
    if (!Number.isInteger(offering.mealsPerDay) || (offering.mealsPerDay ?? 0) < 1 || (offering.mealsPerDay ?? 0) > 20) {
      errors.push('Meal plans require 1-20 meals per day.');
    }
    if (!Array.isArray(offering.mealSlotIds) || offering.mealSlotIds.some((id) => !offering.slots?.some((slot) => slot.id === id))) {
      errors.push('Meal slots must reference configured schedule slots.');
    }
    if (!offering.skipRules || !Number.isInteger(offering.skipRules.cutoffMinutes) || offering.skipRules.cutoffMinutes < 0 || !Number.isInteger(offering.skipRules.maxSkipsPerPeriod) || offering.skipRules.maxSkipsPerPeriod < 0) {
      errors.push('Meal plans require valid skip cut-off and maximum skip settings.');
    }
  }
  if (offering.kind === 'class-course' && offering.enrollmentLimit != null && (!Number.isInteger(offering.enrollmentLimit) || offering.enrollmentLimit < 1)) {
    errors.push('Enrollment limit must be a positive integer or null.');
  }

  return [...new Set(errors)];
}

export function resolveTenantLabels(
  tenantType: TenantType,
  overrides?: Partial<TenantLabels> | null,
): TenantLabels {
  return { ...tenantTypeConfig[tenantType].labels, ...overrides };
}