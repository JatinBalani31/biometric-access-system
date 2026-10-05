export const tenantRoles = ['owner', 'manager', 'front-desk', 'read-only-auditor'] as const;
export type TenantRole = (typeof tenantRoles)[number];
export type TenantResource = 'profile' | 'subscribers' | 'plans' | 'offerings' | 'devices' | 'activity' | 'biometrics';
export type TenantAction = 'read' | 'create' | 'update' | 'delete';

export const tenantPermissionMatrix: Record<
  TenantRole,
  Record<TenantResource, Record<TenantAction, boolean>>
> = {
  owner: {
    profile: { read: true, create: false, update: true, delete: false },
    subscribers: { read: true, create: true, update: true, delete: true },
    plans: { read: true, create: true, update: true, delete: true },
    offerings: { read: true, create: true, update: true, delete: true },
    devices: { read: true, create: true, update: true, delete: true },
    activity: { read: true, create: false, update: false, delete: false },
    biometrics: { read: true, create: true, update: true, delete: true },
  },
  manager: {
    profile: { read: true, create: false, update: false, delete: false },
    subscribers: { read: true, create: true, update: true, delete: false },
    plans: { read: true, create: true, update: true, delete: false },
    offerings: { read: true, create: true, update: true, delete: false },
    devices: { read: true, create: true, update: true, delete: false },
    activity: { read: true, create: false, update: false, delete: false },
    biometrics: { read: true, create: true, update: true, delete: false },
  },
  'front-desk': {
    profile: { read: true, create: false, update: false, delete: false },
    subscribers: { read: true, create: true, update: true, delete: false },
    plans: { read: true, create: false, update: false, delete: false },
    offerings: { read: true, create: false, update: false, delete: false },
    devices: { read: true, create: false, update: false, delete: false },
    activity: { read: false, create: false, update: false, delete: false },
    biometrics: { read: false, create: false, update: false, delete: false },
  },
  'read-only-auditor': {
    profile: { read: true, create: false, update: false, delete: false },
    subscribers: { read: true, create: false, update: false, delete: false },
    plans: { read: true, create: false, update: false, delete: false },
    offerings: { read: true, create: false, update: false, delete: false },
    devices: { read: true, create: false, update: false, delete: false },
    activity: { read: true, create: false, update: false, delete: false },
    biometrics: { read: false, create: false, update: false, delete: false },
  },
};

export function canTenant(
  role: TenantRole | undefined,
  resource: TenantResource,
  action: TenantAction
): boolean {
  return role !== undefined && tenantPermissionMatrix[role][resource][action];
}