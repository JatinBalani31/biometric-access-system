import express from 'express';
import { authenticate } from './middleware/auth.ts';
import { rateLimit } from './middleware/rate-limit.ts';
import { tenantsRouter } from './routes/tenants.ts';
import { plansRouter } from './routes/plans.ts';
import { offeringsRouter } from './routes/offerings.ts';
import { subscribersRouter } from './routes/subscribers.ts';
import { devicesRouter } from './routes/devices.ts';
import { kioskRouter } from './routes/kiosk.ts';
import { systemRouter } from './routes/system.ts';
import { registerRouter } from './routes/register.ts';

/**
 * Builds the API-only Express app (no static file serving, no Vite, no listen()).
 * Shared by both entrypoints:
 *  - server.ts    — local dev / Cloud Run: adds Vite middleware or static `dist/`, then listens
 *  - api/index.ts — Vercel: wraps this in a serverless-http handler; Vercel serves `dist/` separately
 */
export function createApp() {
  const app = express();

  // Hosting and Cloud Run terminate TLS ahead of us, so the real client address
  // only arrives in X-Forwarded-For. Without this every caller looks like the
  // proxy and shares a single rate-limit bucket.
  app.set('trust proxy', true);

  // A face vector is ~192 floats; 10mb let an anonymous caller push megabytes per
  // request. 256kb covers the largest legitimate payload with room to spare.
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));

  // Strip headers that advertise the stack to scanners.
  app.disable('x-powered-by');

  app.use('/api', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Blanket ceiling on the whole API, then tighter limits on the unauthenticated
  // routes below. Anonymous endpoints are the ones worth scripting against.
  app.use('/api', rateLimit({ name: 'global', limit: 300, windowMs: 60_000 }));

  // Global Auth/Role discovery
  app.use('/api', authenticate);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'B2B Multi-Tenant Subscription API',
      timestamp: new Date().toISOString(),
      caller: (req as any).auth || { role: 'anonymous' },
    });
  });

  // Public Registration (no auth required) — the only route where an anonymous
  // caller can write, so it gets the strictest budget.
  app.use(
    '/api/register',
    rateLimit({
      name: 'register',
      limit: 10,
      windowMs: 15 * 60_000,
      message: 'Too many registration attempts from this network. Please try again in a few minutes.',
    }),
    registerRouter
  );

  // Device pairing is unauthenticated by design (the code *is* the credential),
  // so cap attempts to keep the 6-digit space from being brute-forced.
  app.use(
    '/api/devices/pair',
    rateLimit({
      name: 'pair',
      limit: 5,
      windowMs: 10 * 60_000,
      message: 'Too many pairing attempts. Please request a new code and try again.',
    })
  );

  // REST API Routes
  app.use('/api/tenants', tenantsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/offerings', offeringsRouter);
  app.use('/api/subscribers', subscribersRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/kiosk', kioskRouter);
  app.use('/api/system', systemRouter);

  // 404 for unhandled API endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `Endpoint ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    });
  });

  return app;
}
