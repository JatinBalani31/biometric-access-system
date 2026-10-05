import { Offering, OfferingSlot } from './tenant-product.ts';

export type CheckInReason =
  | 'allowed'
  | 'member_inactive'
  | 'not_started'
  | 'expired'
  | 'offering_inactive'
  | 'device_inactive'
  | 'capacity_full'
  | 'outside_time_window'
  | 'slot_required'
  | 'not_enrolled'
  | 'daily_limit_reached'
  | 'duplicate_entry';

export interface CheckInMember {
  id: number;
  status: string;
  startsAt: string;
  endsAt: string;
  offeringIds: number[];
}

export interface CheckInDevice {
  status: string;
}

export interface CheckInHistoryEntry {
  checkedInAt: string;
  slotId?: string | null;
}

export interface CheckInInput {
  member: CheckInMember;
  offering: Offering;
  device: CheckInDevice;
  timestamp: Date;
  history?: CheckInHistoryEntry[];
  activeEnrollmentCount?: number;
  activeSlotCount?: number;
  slotId?: string;
}

export interface CheckInDecision {
  allowed: boolean;
  reason: CheckInReason;
  message: string;
}

const deny = (reason: Exclude<CheckInReason, 'allowed'>, message: string): CheckInDecision => ({
  allowed: false,
  reason,
  message,
});

function localParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((value) => value.type === type)?.value ?? '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dateKey: `${part('year')}-${part('month')}-${part('day')}`,
    weekday: weekdays[part('weekday')],
    minuteOfDay: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function slotIsOpen(slot: OfferingSlot, weekday: number, minuteOfDay: number): boolean {
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  if (start === null || end === null || !slot.weekdays.includes(weekday)) return false;
  if (start <= end) return minuteOfDay >= start && minuteOfDay <= end;
  return minuteOfDay >= start || minuteOfDay <= end;
}

export function evaluateCheckIn(input: CheckInInput): CheckInDecision {
  const { member, offering, device, timestamp, history = [] } = input;
  if (member.status !== 'active') return deny('member_inactive', 'This account is not active.');
  if (timestamp.getTime() < new Date(member.startsAt).getTime()) return deny('not_started', 'Access has not started yet.');
  if (timestamp.getTime() > new Date(member.endsAt).getTime()) return deny('expired', 'This offering has expired.');
  if (!offering.active) return deny('offering_inactive', 'This offering is unavailable.');
  if (device.status !== 'active') return deny('device_inactive', 'This access device is not active.');
  if (!member.offeringIds.includes(offering.id)) return deny('not_enrolled', 'This account is not enrolled in this offering.');

  if (offering.capacityLimit !== null && (input.activeEnrollmentCount ?? 0) >= offering.capacityLimit) {
    return deny('capacity_full', 'This offering has reached its capacity.');
  }

  const { dateKey, weekday, minuteOfDay } = localParts(timestamp, offering.timezone || 'UTC');
  const dayHistory = history.filter((entry) => localParts(new Date(entry.checkedInAt), offering.timezone || 'UTC').dateKey === dateKey);
  const duplicateWindowMs = Math.max(0, offering.duplicateWindowMinutes) * 60_000;
  if (duplicateWindowMs > 0 && dayHistory.some((entry) => Math.abs(timestamp.getTime() - new Date(entry.checkedInAt).getTime()) < duplicateWindowMs)) {
    return deny('duplicate_entry', 'A recent check-in is already recorded.');
  }
  if (offering.maxEntriesPerDay !== null && dayHistory.length >= offering.maxEntriesPerDay) {
    return deny('daily_limit_reached', 'The daily check-in limit has been reached.');
  }

  const configuredSlots = offering.slots;
  let selectedSlot: OfferingSlot | undefined;
  if (input.slotId) {
    selectedSlot = configuredSlots.find((slot) => slot.id === input.slotId);
    if (!selectedSlot || !slotIsOpen(selectedSlot, weekday, minuteOfDay)) {
      return deny('outside_time_window', 'This check-in is outside the selected slot.');
    }
  } else if (configuredSlots.length > 0) {
    const openSlots = configuredSlots.filter((slot) => slotIsOpen(slot, weekday, minuteOfDay));
    if (openSlots.length === 0) return deny('outside_time_window', 'This check-in is outside the configured schedule.');
    if (openSlots.length > 1) return deny('slot_required', 'Choose a slot for this check-in.');
    selectedSlot = openSlots[0];
  }

  if (selectedSlot) {
    const capacity = selectedSlot.capacityLimit;
    if (capacity != null && (input.activeSlotCount ?? 0) >= capacity) {
      return deny('capacity_full', 'This slot has reached its capacity.');
    }
    if (dayHistory.some((entry) => entry.slotId === selectedSlot?.id)) {
      return deny('duplicate_entry', 'A check-in is already recorded for this slot today.');
    }
  }

  return { allowed: true, reason: 'allowed', message: 'Access granted.' };
}