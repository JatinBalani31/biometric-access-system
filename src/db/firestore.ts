import { adminDb } from '../lib/firebase-admin.ts';

/**
 * Firestore data-access layer replacing Drizzle/Postgres.
 *
 * Firestore has no auto-increment and no joins, so this layer:
 *  - Assigns sequential numeric IDs via a transaction against `_counters/{name}`,
 *    so every existing `tenantId: number` / `subscriberId: number` etc. across the
 *    React admin panel, the kiosk Android app, and these route files keeps working
 *    unchanged — only the storage underneath moved.
 *  - Exposes small generic CRUD + query helpers; route files compose these instead
 *    of a query builder. Cross-collection "joins" (e.g. tenant + its subscribers +
 *    its devices) are done in the route handler as multiple awaited calls.
 *
 * Collection names mirror the old table names so existing Firestore embedding
 * collections (face_embeddings, sync_status, device_sync_logs — see firestore-sync.ts)
 * live alongside these without colliding.
 */

export const collections = {
  tenants: 'tenants',
  tenantAdmins: 'tenant_admins',
  subscriptionPlans: 'subscription_plans',
  subscribers: 'subscribers',
  devices: 'devices',
  companyAdmins: 'company_admins',
  auditLogs: 'audit_logs',
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];

/** Assigns the next sequential integer ID for a collection, transactionally. */
export async function nextId(counterName: CollectionName): Promise<number> {
  const ref = adminDb.collection('_counters').doc(counterName);
  return adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? ((doc.data()?.value as number) ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

/** Creates a doc with an auto-assigned numeric `id` field, doc ID = String(id). */
export async function createDoc<T extends Record<string, any>>(
  collection: CollectionName,
  data: Omit<T, 'id'>
): Promise<T> {
  const id = await nextId(collection);
  const record = { id, ...data } as unknown as T;
  await adminDb
    .collection(collection)
    .doc(String(id))
    .set(record);
  return record;
}

/** Creates a doc with an explicit ID (used for singleton/known-key docs like company_admins). */
export async function setDoc<T extends Record<string, any>>(
  collection: CollectionName,
  id: number | string,
  data: T
): Promise<void> {
  await adminDb.collection(collection).doc(String(id)).set(data);
}

export async function getDoc<T>(collection: CollectionName, id: number | string): Promise<T | null> {
  const snap = await adminDb.collection(collection).doc(String(id)).get();
  return snap.exists ? (snap.data() as T) : null;
}

export async function updateDoc(
  collection: CollectionName,
  id: number | string,
  data: Record<string, any>
): Promise<void> {
  await adminDb.collection(collection).doc(String(id)).set(data, { merge: true });
}

export async function deleteDoc(collection: CollectionName, id: number | string): Promise<void> {
  await adminDb.collection(collection).doc(String(id)).delete();
}

export type WhereClause = [string, FirebaseFirestore.WhereFilterOp, any];

export async function listDocs<T>(collection: CollectionName, where?: WhereClause[]): Promise<T[]> {
  let q: FirebaseFirestore.Query = adminDb.collection(collection);
  if (where) {
    for (const [field, op, value] of where) {
      q = q.where(field, op, value);
    }
  }
  const snap = await q.get();
  return snap.docs.map((d) => d.data() as T);
}

export async function findOne<T>(collection: CollectionName, field: string, value: any): Promise<T | null> {
  const snap = await adminDb.collection(collection).where(field, '==', value).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as T);
}

export async function deleteWhere(collection: CollectionName, field: string, value: any): Promise<number> {
  const snap = await adminDb.collection(collection).where(field, '==', value).get();
  if (snap.empty) return 0;
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.docs.length;
}

/** Deletes every document in a collection (dev/testing "wipe all" support). */
export async function clearCollection(collection: CollectionName): Promise<number> {
  const snap = await adminDb.collection(collection).get();
  if (snap.empty) return 0;
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.docs.length;
}
