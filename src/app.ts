import express from 'express';
import { authenticate } from './middleware/auth.ts';
import { tenantsRouter } from './routes/tenants.ts';
import { plansRouter } from './routes/plans.ts';
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

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

  // Public Registration (no auth required)
  app.use('/api/register', registerRouter);

  // REST API Routes
  app.use('/api/tenants', tenantsRouter);
  app.use('/api/plans', plansRouter);
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
