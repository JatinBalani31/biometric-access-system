import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../src/lib/firebase-admin.ts';

async function main() {
  const apply = process.argv.includes('--apply');
  const devices = await adminDb.collection('devices').get();
  const candidates = devices.docs.filter((doc) => {
    const data = doc.data();
    return typeof data.deviceToken === 'string' || typeof data.pairingCode === 'string';
  });

  console.log(`${candidates.length} device record(s) contain credential fields.`);
  if (!apply) {
    console.log('Dry run only. Review the count, then rerun with --apply to migrate.');
    return;
  }

  for (let offset = 0; offset < candidates.length; offset += 400) {
    const batch = adminDb.batch();
    for (const deviceDoc of candidates.slice(offset, offset + 400)) {
      const device = deviceDoc.data();
      const id = Number(device.id ?? deviceDoc.id);
      const tenantId = Number(device.tenantId);
      if (!Number.isInteger(id) || !Number.isInteger(tenantId)) {
        throw new Error(`Device ${deviceDoc.id} has invalid id/tenantId; aborting migration.`);
      }

      const secretRef = adminDb.collection('device_secrets').doc(String(id));
      const currentSecret = await secretRef.get();
      const existingSecret = currentSecret.data() ?? {};
      if (
        existingSecret.deviceToken &&
        device.deviceToken &&
        existingSecret.deviceToken !== device.deviceToken
      ) {
        throw new Error(`Device ${id} already has a different secret; resolve it before migrating.`);
      }

      batch.set(secretRef, {
        id,
        tenantId,
        deviceToken: device.deviceToken ?? existingSecret.deviceToken,
        pairingCode: device.pairingCode ?? existingSecret.pairingCode ?? null,
        pairingCodeExpiresAt: device.pairingCodeExpiresAt ?? existingSecret.pairingCodeExpiresAt ?? null,
      }, { merge: true });
      batch.update(deviceDoc.ref, {
        deviceToken: FieldValue.delete(),
        pairingCode: FieldValue.delete(),
        pairingCodeExpiresAt: FieldValue.delete(),
      });
    }
    await batch.commit();
  }

  console.log(`Migrated ${candidates.length} device record(s).`);
}

main().catch((error) => {
  console.error('Device secret migration failed:', error.message);
  process.exit(1);
});