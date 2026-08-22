import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { memoryStore } from './memory-store.ts';

export interface AuditLogPayload {
  actorEmail: string;
  actorRole?: string;
  action: 'TENANT_CREATED' | 'TENANT_LIMIT_UPDATED' | 'TENANT_PLAN_UPDATED' | 'TENANT_STATUS_UPDATED' | 'ADMIN_INVITED' | 'DEVICE_REGISTERED' | 'DEVICE_REVOKED';
  tenantId?: number | null;
  tenantName?: string | null;
  targetType?: string;
  targetId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
}

export async function logAuditAction(payload: AuditLogPayload) {
  const record = {
    actorEmail: payload.actorEmail || 'unknown@platform.io',
    actorRole: payload.actorRole || 'company_admin',
    action: payload.action,
    tenantId: payload.tenantId ?? null,
    tenantName: payload.tenantName ?? null,
    targetType: payload.targetType || 'tenant',
    targetId: payload.targetId ? String(payload.targetId) : null,
    previousState: payload.previousState ? (typeof payload.previousState === 'string' ? payload.previousState : JSON.stringify(payload.previousState)) : null,
    newState: payload.newState ? (typeof payload.newState === 'string' ? payload.newState : JSON.stringify(payload.newState)) : null,
    ipAddress: payload.ipAddress || '127.0.0.1',
    createdAt: new Date(),
  };

  try {
    const [inserted] = await db.insert(auditLogs).values(record).returning();
    return inserted;
  } catch (err) {
    // Fallback to memoryStore
    const fallbackRecord = {
      id: (memoryStore.auditLogs?.length || 0) + 1,
      ...record,
    };
    if (!memoryStore.auditLogs) {
      memoryStore.auditLogs = [];
    }
    memoryStore.auditLogs.unshift(fallbackRecord);
    return fallbackRecord;
  }
}
