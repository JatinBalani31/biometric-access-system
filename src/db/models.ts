/**
 * Plain TypeScript interfaces for Firestore documents — replaces the Drizzle
 * `InferSelectModel`/`InferInsertModel` types that used to come from schema.ts.
 * Field names are unchanged from the old Postgres columns (camelCase) so every
 * consumer (React admin panel, Android kiosk app, route handlers) keeps working
 * against the same JSON shape.
 */

import type { Offering as TenantOffering, TenantLabels, TenantType } from '../lib/tenant-product.ts';

export interface Tenant {
  id: number;
  companyName: string;
  contactEmail: string;
  planTier: string; // 'starter' | 'pro' | 'enterprise'
  subscriberLimit: number;
  status: string; // 'active' | 'suspended' | 'canceled'
  tenantType?: TenantType;
  labels?: Partial<TenantLabels>;
  createdAt: string;
}
export type NewTenant = Omit<Tenant, 'id'>;

export interface TenantAdmin {
  id: number;
  tenantId: number;
  email: string;
  role: string; // 'admin' | 'manager' | 'viewer'
  uid: string | null;
  createdAt: string;
}
export type NewTenantAdmin = Omit<TenantAdmin, 'id'>;

export interface SubscriptionPlan {
  id: number;
  tenantId: number;
  name: string;
  durationDays: number;
  price: string;
  createdAt: string;
}
export type NewSubscriptionPlan = Omit<SubscriptionPlan, 'id'>;

export interface Offering extends TenantOffering {}
export type NewOffering = Omit<Offering, 'id'>;

export interface Subscriber {
  id: number;
  tenantId: number;
  name: string;
  phone: string | null;
  email: string | null;
  planId: number | null;
  offeringId?: number | null;
  paymentStatus?: 'pending' | 'paid' | 'not_required';
  startDate: string;
  endDate: string;
  status: string; // 'active' | 'expired' | 'suspended'
  createdAt: string;
}
export type NewSubscriber = Omit<Subscriber, 'id'>;

export interface CheckInLog {
  id: number;
  tenantId: number;
  subscriberId: number;
  offeringId: number;
  deviceId: number | null;
  slotId: string | null;
  allowed: boolean;
  reason: string;
  checkedInAt: string;
}

export interface Device {
  id: number;
  tenantId: number;
  deviceName: string;
  deviceToken?: string;
  status: string; // 'active' | 'revoked' | 'maintenance' | 'pending'
  lastSyncedAt: string | null;
  createdAt: string;
  pairingCode?: string | null;
  pairingCodeExpiresAt?: string | null;
}
export type NewDevice = Omit<Device, 'id'>;

export interface DeviceSecret {
  id: number;
  tenantId: number;
  deviceToken: string;
  pairingCode?: string | null;
  pairingCodeExpiresAt?: string | null;
}

export interface CompanyAdmin {
  id: number;
  email: string;
  role: string;
  uid: string | null;
  createdAt: string;
}
export type NewCompanyAdmin = Omit<CompanyAdmin, 'id'>;

export interface AuditLog {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  tenantId: number | null;
  tenantName: string | null;
  targetType: string;
  targetId: string | null;
  previousState: string | null;
  newState: string | null;
  ipAddress: string | null;
  createdAt: string;
}
export type NewAuditLog = Omit<AuditLog, 'id'>;
