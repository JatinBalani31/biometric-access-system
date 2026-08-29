import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from '../../src/app.ts';

// Cloud Functions (Gen 2) HTTPS entrypoint. `firebase.json` rewrites Hosting's
// /api/** requests to this function; everything else is served as static files
// from the Vite build output (dist/). One Express app, same as local dev and
// the Firestore-backed route handlers — only the hosting environment differs.
const app = createApp();

export const api = onRequest({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 30 }, app);
