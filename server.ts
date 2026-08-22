import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { authenticate } from './src/middleware/auth.ts';
import { tenantsRouter } from './src/routes/tenants.ts';
import { plansRouter } from './src/routes/plans.ts';
import { subscribersRouter } from './src/routes/subscribers.ts';
import { devicesRouter } from './src/routes/devices.ts';
import { kioskRouter } from './src/routes/kiosk.ts';
import { systemRouter } from './src/routes/system.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
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

  // Vite middleware for frontend development / production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`B2B Subscription Management API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
