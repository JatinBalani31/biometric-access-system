import { createDoc, collections } from '../db/firestore.ts';
import { NewAuditLog } from '../db/models.ts';

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
  const record: NewAuditLog = {
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
    createdAt: new Date().toISOString(),
  };

  try {
    return await createDoc(collections.auditLogs, record);
  } catch (err) {
    console.warn('[audit-logger] Firestore write failed:', err);
    return { id: 0, ...record };
  }
}
