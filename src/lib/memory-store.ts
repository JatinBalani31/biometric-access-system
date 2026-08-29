import {
  CompanyAdmin,
  Tenant,
  TenantAdmin,
  SubscriptionPlan,
  Subscriber,
  KioskDevice,
  AccessLog,
  AuditLogRecord,
  VerificationRequest,
  VerificationResult,
} from '../types/api.ts';

const now = new Date();

export interface MemoryStore {
  companyAdmins: CompanyAdmin[];
  tenants: Tenant[];
  tenantAdmins: TenantAdmin[];
  subscriptionPlans: SubscriptionPlan[];
  subscribers: Subscriber[];
  kioskDevices: KioskDevice[];
  devices: KioskDevice[];
  accessLogs: AccessLog[];
  auditLogs: AuditLogRecord[];
}

export const memoryStore: MemoryStore = {
  companyAdmins: [
    {
      id: 1,
      email: 'superadmin@platform.io',
      role: 'superadmin',
      createdAt: now,
    },
  ],
  tenants: [
    {
      id: 1,
      companyName: 'Apex Health & Fitness',
      contactEmail: 'contact@apexfitness.com',
      planTier: 'pro',
      subscriberLimit: 100,
      status: 'active',
      createdAt: now,
    },
  ],
  tenantAdmins: [
    { id: 1, tenantId: 1, email: 'admin@apexfitness.com', role: 'admin', createdAt: now },
  ],
  subscriptionPlans: [
    { id: 1, tenantId: 1, name: 'Monthly All-Access Pass', durationDays: 30, price: '59.00', createdAt: now },
    { id: 2, tenantId: 1, name: 'Quarterly VIP Pass', durationDays: 90, price: '149.00', createdAt: now },
    { id: 3, tenantId: 1, name: 'Annual Elite Pass', durationDays: 365, price: '499.00', createdAt: now },
  ],
  // Clean slate: 0 subscribers
  subscribers: [],
  kioskDevices: [
    {
      id: 1,
      tenantId: 1,
      deviceName: 'Apex Main Entrance Kiosk',
      deviceToken: 'dev_apex_kiosk_main_a109bf83',
      location: 'Turnstile A1 - Reception',
      lastHeartbeat: now,
      status: 'online',
      firmwareVersion: '1.2.0',
      syncedEmbeddingCount: 0,
      createdAt: now,
    },
  ],
  devices: [
    {
      id: 1,
      tenantId: 1,
      deviceName: 'Apex Main Entrance Kiosk',
      deviceToken: 'dev_apex_kiosk_main_a109bf83',
      location: 'Turnstile A1 - Reception',
      lastHeartbeat: now,
      status: 'online',
      firmwareVersion: '1.2.0',
      syncedEmbeddingCount: 0,
      createdAt: now,
    },
  ],
  accessLogs: [],
  auditLogs: [],
};

// In-memory helper methods
export function findSubscriberById(id: number): Subscriber | undefined {
  return memoryStore.subscribers.find((s) => s.id === id);
}

export function findTenantById(id: number): Tenant | undefined {
  return memoryStore.tenants.find((t) => t.id === id);
}

export function findKioskDeviceByToken(token: string): KioskDevice | undefined {
  return memoryStore.kioskDevices.find((d) => d.deviceToken === token);
}

export function getTenantSubscribers(tenantId: number): Subscriber[] {
  return memoryStore.subscribers.filter((s) => s.tenantId === tenantId);
}

export function getTenantPlans(tenantId: number): SubscriptionPlan[] {
  return memoryStore.subscriptionPlans.filter((p) => p.tenantId === tenantId);
}

export function getTenantDevices(tenantId: number): KioskDevice[] {
  return memoryStore.kioskDevices.filter((d) => d.tenantId === tenantId);
}

export function getTenantLogs(tenantId: number): AccessLog[] {
  return memoryStore.accessLogs.filter((l) => l.tenantId === tenantId);
}

/**
 * Reset memoryStore to fresh state with 1 single tenant and 0 subscribers.
 */
export function resetMemoryStore(): void {
  memoryStore.subscribers = [];
  memoryStore.accessLogs = [];
  memoryStore.auditLogs = [];
  console.log('[MemoryStore] Reset to clean slate: 1 tenant, 0 subscribers.');
}
