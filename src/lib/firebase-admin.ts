import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  initializeApp({
    projectId,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
