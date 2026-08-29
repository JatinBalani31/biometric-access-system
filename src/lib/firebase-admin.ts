import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

  // On GCP (Cloud Run, local dev with `gcloud auth application-default login`), the
  // metadata server / ADC provides credentials automatically — just pass projectId.
  // On Vercel there is no metadata server, so a service account key must be supplied
  // explicitly via FIREBASE_SERVICE_ACCOUNT_B64 (the service account JSON, base64-encoded
  // so it survives being pasted into a single-line env var).
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (serviceAccountB64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString('utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } else {
    initializeApp({ projectId });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
