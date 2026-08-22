import { initializeFirestoreCollections } from '../src/lib/firestore-sync.ts';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('====================================================');
  console.log('Setting up Firebase Auth & Firestore Collections');
  console.log('Target Collections: "face_embeddings", "sync_status"');
  console.log('====================================================');

  const result = await initializeFirestoreCollections();
  if (result.success) {
    console.log('[Setup Firebase] Collections initialized successfully.');
  } else {
    console.warn('[Setup Firebase] Firestore warning (fallback active):', result.error);
  }
}

main().catch(console.error);
