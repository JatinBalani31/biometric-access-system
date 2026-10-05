import type { TenantRole } from '../lib/permissions.ts';

export type UserRole = 'company_admin' | 'tenant_admin' | 'device' | 'anonymous';

export interface AuthContext {
  role: UserRole;
  email?: string;
  uid?: string;
  tenantId?: number; // Present for tenant_admin and device
  tenantRole?: TenantRole;
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

export interface CreateSubscriberRequest {
  name: string;
  email?: string;
  phone?: string;
  plan_id?: number;
  duration_days?: number;
  face_vector?: number[];
}

export interface FaceEmbeddingRecord {
  id: string;
  subscriberId: number;
  tenantId: number;
  subscriberName: string;
  email?: string;
  /** L2-normalized embedding produced by FACE_MODEL_ID. */
  vector: number[];
  vectorDimension: number;
  /** Which extractor produced this vector. Vectors from different models are NOT comparable. */
  modelId: string;
  status: 'active' | 'revoked' | 'pending';
  updatedAt: string; // ISO string
  createdAt: string;
  // Enrichment added by the kiosk sync route for on-device result display
  planName?: string | null;
  daysLeft?: number;
  isExpired?: boolean;
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
  /** Extractor the device must use so its probe lands in the same space. */
  modelId?: string;
  embeddingDimension?: number;
  /** Enrolled vectors dropped because they came from a different extractor. */
  skippedIncompatible?: number;
}

// ─── Face embedding model contract ────────────────────────────────────────────
// Every enrolled vector MUST come from the same model as the one the kiosk runs
// for matching, otherwise cosine similarity is meaningless noise.
// Kiosk: app/src/main/assets/mobilefacenet.tflite (112x112 RGB, (x-127.5)/128).
export const FACE_MODEL_ID = 'mobilefacenet_112_v1';
export const FACE_EMBEDDING_DIM = 192;
/** Demo/seed vectors. Never matchable — filtered out of real kiosk galleries. */
export const SYNTHETIC_MODEL_ID = 'synthetic_demo';

// ─── Domain records (used by the in-memory dev store) ─────────────────────────

export interface CompanyAdmin {
  id: number;
  email: string;
  role: string;
  createdAt: Date;
}

export interface Tenant {
  id: number;
  companyName: string;
  contactEmail: string;
  planTier: string;
  subscriberLimit: number;
  status: string;
  createdAt: Date;
}

export interface TenantAdmin {
  id: number;
  tenantId: number;
  email: string;
  role: string;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: number;
  tenantId: number;
  name: string;
  durationDays: number;
  price: string;
  createdAt: Date;
}

export interface Subscriber {
  id: number;
  tenantId: number;
  name: string;
  email: string | null;
  phone?: string | null;
  planId: number | null;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  createdAt: Date;
}

export interface KioskDevice {
  id: number;
  tenantId: number;
  deviceName: string;
  deviceToken: string;
  location?: string;
  lastHeartbeat?: Date;
  lastSyncedAt?: Date | null;
  status: string;
  firmwareVersion?: string;
  syncedEmbeddingCount?: number;
  createdAt: Date;
}

export interface AccessLog {
  id: number;
  tenantId: number;
  subscriberId?: number | null;
  deviceId?: number | null;
  result: string;
  reason?: string | null;
  similarityScore?: number | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: number;
  tenantId?: number | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  previousState: string | null;
  newState: string | null;
  ipAddress: string;
  createdAt: Date;
}

export interface VerificationRequest {
  subscriber_id?: number;
  email?: string;
  phone?: string;
  face_vector?: number[];
}

export interface VerificationResult {
  accessGranted: boolean;
  subscriber?: Subscriber | null;
  reason: string;
  similarityScore?: number;
}
