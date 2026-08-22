export type UserRole = 'company_admin' | 'tenant_admin' | 'device' | 'anonymous';

export interface AuthContext {
  role: UserRole;
  email?: string;
  uid?: string;
  tenantId?: number; // Present for tenant_admin and device
  tenantName?: string | null;
  tenantStatus?: string | null;
  deviceId?: number; // Present for device
  deviceName?: string;
}

export interface ErrorResponse {
  error: string;
  code: 'LIMIT_EXCEEDED' | 'TENANT_SUSPENDED' | 'INVALID_DEVICE_TOKEN' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'INTERNAL_ERROR';
  details?: any;
  limit?: number;
  currentCount?: number;
}

export interface FaceEmbeddingRecord {
  id: string;
  subscriberId: number;
  tenantId: number;
  subscriberName: string;
  email?: string;
  vector: number[]; // 128-d or 512-d normalized floats
  vectorDimension: number;
  status: 'active' | 'revoked' | 'pending';
  updatedAt: string; // ISO string
  createdAt: string;
}

export interface DeviceSyncResponse {
  tenantId: number;
  deviceId?: number;
  deviceName?: string;
  serverTime: string;
  since?: string | null;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  embeddings: FaceEmbeddingRecord[];
}
