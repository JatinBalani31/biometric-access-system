import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from '../../src/app.ts';

let app: ReturnType<typeof createApp> | null = null;

export const api = onRequest({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 30 }, (req, res) => {
  if (!app) {
    app = createApp();
  }
  app(req, res);
});
