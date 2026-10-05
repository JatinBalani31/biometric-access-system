import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../src/lib/firebase-admin.ts';

const migrationId = 'tenant-product-v1';

async function main() {
  const apply = process.argv.includes('--apply');
  const backups = await adminDb.collection('_schema_migrations').where('migrationId', '==', migrationId).get();
  const completed = backups.docs.filter((entry) => entry.data().status === 'applied');
  console.log(`${completed.length} tenant(s) have a completed ${migrationId} migration.`);
  if (!apply) {
    console.log('Dry run only; no documents changed. Pass --apply to delete generated offerings and restore tenant type/labels.');
    return;
  }

  for (const backupDoc of completed) {
    const backup = backupDoc.data();
    const tenantId = Number(backup.tenantId);
    const previous = backup.previous ?? {};
    const tenantRef = adminDb.collection('tenants').doc(String(tenantId));
    await tenantRef.set({
      tenantType: previous.tenantType ?? FieldValue.delete(),
      labels: previous.labels ?? FieldValue.delete(),
    }, { merge: true });

    for (const offeringId of backup.generatedOfferingIds ?? []) {
      await adminDb.collection('offerings').doc(String(offeringId)).delete();
    }
    await backupDoc.ref.set({ status: 'rolled_back', rolledBackAt: new Date().toISOString() }, { merge: true });
  }
  console.log(`Rollback of ${migrationId} completed.`);
}

main().catch((error) => {
  console.error('Tenant product rollback failed:', error.message);
  process.exit(1);
});