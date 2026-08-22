import { adminDb } from './firebase-admin.ts';
import { FaceEmbeddingRecord } from '../types/api.ts';

export const EMBEDDINGS_COLLECTION = 'face_embeddings';
export const SYNC_STATUS_COLLECTION = 'sync_status';
export const DEVICE_LOGS_COLLECTION = 'device_sync_logs';

export interface SyncStatusRecord {
  id: string; // `tenant_${tenantId}` or `device_${deviceId}`
  tenantId: number;
  deviceId?: number;
  deviceName?: string;
  lastSyncTimestamp: string;
  totalSyncedEmbeddings: number;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  lastError?: string;
  metadata?: Record<string, any>;
  updatedAt: string;
}

/**
 * Generate a synthetic 128-dimensional normalized face embedding vector for testing/demo
 */
export function generateSyntheticEmbedding(seed: number = Math.random()): number[] {
  const vector: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < 128; i++) {
    const val = Math.sin(seed * (i + 1)) * Math.cos(seed * (i + 7));
    vector.push(parseFloat(val.toFixed(4)));
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => parseFloat((v / norm).toFixed(4)));
}

/**
 * Initialize Firestore Collections with seed health/status documents
 */
export async function initializeFirestoreCollections() {
  const now = new Date().toISOString();
  console.log('[Firestore] Initializing collections: "face_embeddings" and "sync_status"...');

  try {
    // 1. Initialize sync_status collection metadata
    const syncStatusRef = adminDb.collection(SYNC_STATUS_COLLECTION).doc('system_overview');
    await syncStatusRef.set({
      service: 'B2B Face Embeddings Sync Service',
      version: '1.0.0',
      status: 'active',
      supportedCollections: [EMBEDDINGS_COLLECTION, SYNC_STATUS_COLLECTION, DEVICE_LOGS_COLLECTION],
      vectorDimensions: 128,
      lastHealthCheck: now,
      createdAt: now,
    }, { merge: true });

    console.log(`[Firestore] Initialized doc "${SYNC_STATUS_COLLECTION}/system_overview"`);
    return { success: true, timestamp: now };
  } catch (error: any) {
    console.warn('[Firestore Init Warning]: Firestore offline or unconfigured. Proceeding with fallback mode.', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Upsert Face Embedding for a subscriber in Firestore
 */
export async function saveFaceEmbedding(params: {
  tenantId: number;
  subscriberId: number;
  subscriberName: string;
  email?: string;
  vector?: number[];
  status?: 'active' | 'revoked' | 'pending';
}): Promise<FaceEmbeddingRecord> {
  const docId = `tenant_${params.tenantId}_sub_${params.subscriberId}`;
  const now = new Date().toISOString();
  const vector = params.vector && params.vector.length > 0
    ? params.vector
    : generateSyntheticEmbedding(params.subscriberId * 31 + params.tenantId);

  const embeddingData: FaceEmbeddingRecord = {
    id: docId,
    tenantId: params.tenantId,
    subscriberId: params.subscriberId,
    subscriberName: params.subscriberName,
    email: params.email || '',
    vector,
    vectorDimension: vector.length,
    status: params.status || 'active',
    updatedAt: now,
    createdAt: now,
  };

  try {
    const docRef = adminDb.collection(EMBEDDINGS_COLLECTION).doc(docId);
    const existing = await docRef.get();
    if (existing.exists) {
      const data = existing.data();
      embeddingData.createdAt = data?.createdAt || now;
      await docRef.set(
        {
          ...embeddingData,
          updatedAt: now,
        },
        { merge: true }
      );
    } else {
      await docRef.set(embeddingData);
    }

    // Update tenant sync status
    await updateTenantSyncStatus({
      tenantId: params.tenantId,
      status: 'pending',
      action: `Subscriber ${params.subscriberName} (${docId}) updated`,
    });

    return embeddingData;
  } catch (error) {
    console.error('Firestore saveFaceEmbedding error (falling back to memory response if offline):', error);
    return embeddingData;
  }
}

/**
 * Fetch face embedding for a specific subscriber
 */
export async function getFaceEmbedding(tenantId: number, subscriberId: number): Promise<FaceEmbeddingRecord | null> {
  const docId = `tenant_${tenantId}_sub_${subscriberId}`;
  try {
    const doc = await adminDb.collection(EMBEDDINGS_COLLECTION).doc(docId).get();
    if (!doc.exists) return null;
    return doc.data() as FaceEmbeddingRecord;
  } catch (error) {
    console.error('Firestore getFaceEmbedding error:', error);
    return null;
  }
}

/**
 * Revoke or remove Face Embedding (marks revoked so kiosks receive the deletion update)
 */
export async function revokeFaceEmbedding(tenantId: number, subscriberId: number): Promise<boolean> {
  const docId = `tenant_${tenantId}_sub_${subscriberId}`;
  const now = new Date().toISOString();
  try {
    const docRef = adminDb.collection(EMBEDDINGS_COLLECTION).doc(docId);
    await docRef.set(
      {
        status: 'revoked',
        updatedAt: now,
      },
      { merge: true }
    );

    await updateTenantSyncStatus({
      tenantId,
      status: 'pending',
      action: `Subscriber ${docId} revoked`,
    });

    return true;
  } catch (error) {
    console.error('Firestore revokeFaceEmbedding error:', error);
    return false;
  }
}

/**
 * Incremental Face Embeddings Query for Kiosks and Sync Agents
 */
export async function fetchFaceEmbeddingsForTenant(params: {
  tenantId: number;
  since?: string | null;
  page?: number;
  limit?: number;
}): Promise<{
  embeddings: FaceEmbeddingRecord[];
  total: number;
  hasMore: boolean;
}> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const tenantId = params.tenantId;

  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection(EMBEDDINGS_COLLECTION)
      .where('tenantId', '==', tenantId);

    if (params.since) {
      // Incremental sync filter: only items updated on or after timestamp
      query = query.where('updatedAt', '>=', params.since);
    }

    const snapshot = await query.orderBy('updatedAt', 'asc').get();
    const allDocs = snapshot.docs.map((d) => d.data() as FaceEmbeddingRecord);
    const total = allDocs.length;
    const startIndex = (page - 1) * limit;
    const paginated = allDocs.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;

    return {
      embeddings: paginated,
      total,
      hasMore,
    };
  } catch (error) {
    console.error('Firestore fetchFaceEmbeddingsForTenant error (using mock fallback for resilience):', error);
    return {
      embeddings: [],
      total: 0,
      hasMore: false,
    };
  }
}

/**
 * Update Tenant or Device status in sync_status collection
 */
export async function updateTenantSyncStatus(params: {
  tenantId: number;
  deviceId?: number;
  status: 'synced' | 'pending' | 'syncing' | 'error';
  action?: string;
  syncedCount?: number;
  error?: string;
}) {
  const docId = params.deviceId ? `device_${params.deviceId}` : `tenant_${params.tenantId}`;
  const now = new Date().toISOString();

  try {
    const docRef = adminDb.collection(SYNC_STATUS_COLLECTION).doc(docId);
    await docRef.set(
      {
        id: docId,
        tenantId: params.tenantId,
        deviceId: params.deviceId || null,
        status: params.status,
        lastAction: params.action || 'Status update',
        syncedCount: params.syncedCount || 0,
        lastError: params.error || null,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore updateTenantSyncStatus warning:', err);
  }
}

/**
 * Fetch Sync Status for Tenant or All Devices
 */
export async function getSyncStatus(tenantId?: number): Promise<SyncStatusRecord[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection(SYNC_STATUS_COLLECTION);
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((d) => d.data() as SyncStatusRecord);
  } catch (error) {
    console.warn('Firestore getSyncStatus warning:', error);
    return [];
  }
}

/**
 * Record Kiosk Device Sync telemetry in Firestore
 */
export async function recordDeviceSyncLog(params: {
  deviceId: number;
  tenantId: number;
  deviceName?: string;
  syncedCount: number;
  since?: string | null;
  ip?: string;
}) {
  try {
    const now = new Date().toISOString();
    const logId = `sync_${params.deviceId}_${Date.now()}`;
    
    // Save detailed event log
    await adminDb.collection(DEVICE_LOGS_COLLECTION).doc(logId).set({
      ...params,
      timestamp: now,
    });

    // Update device status in sync_status collection
    await updateTenantSyncStatus({
      tenantId: params.tenantId,
      deviceId: params.deviceId,
      status: 'synced',
      syncedCount: params.syncedCount,
      action: `Device synced ${params.syncedCount} face embeddings`,
    });
  } catch (err) {
    console.warn('Firestore device sync log error:', err);
  }
}
