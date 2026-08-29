/**
 * One-off: restore a face_embeddings document from a JSON snapshot of
 * GET /api/kiosk/face-embeddings. Used to undo an accidental overwrite.
 *
 *   npx tsx scripts/restore-embedding.ts <snapshot.json> <docId>
 */
import 'dotenv/config';
import fs from 'fs';
import { adminDb } from '../src/lib/firebase-admin.ts';
import { EMBEDDINGS_COLLECTION } from '../src/lib/firestore-sync.ts';

const [snapshotPath, docId] = process.argv.slice(2);
if (!snapshotPath || !docId) {
  console.error('usage: tsx scripts/restore-embedding.ts <snapshot.json> <docId>');
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const record = (snapshot.embeddings || []).find((e: any) => e.id === docId);
if (!record) {
  console.error(`No record "${docId}" in ${snapshotPath}`);
  process.exit(1);
}

// Strip the fields the sync route adds at read time — they are not stored.
const { planName, daysLeft, isExpired, ...stored } = record;

await adminDb.collection(EMBEDDINGS_COLLECTION).doc(docId).set(stored);
console.log(`Restored ${docId} (${stored.subscriberName}, ${stored.vector.length}-D)`);
process.exit(0);
