import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo, Server } from 'node:net';
import type { Response } from 'express';
import { createApp } from '../src/app.ts';
import { requireCompanyAdmin, type AuthenticatedRequest } from '../src/middleware/auth.ts';

let server: Server;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('system endpoint authorization', () => {
  const privateEndpoints = [
    ['GET', '/api/system/summary'],
    ['GET', '/api/system/usage-analytics'],
    ['GET', '/api/system/billing'],
    ['GET', '/api/system/audit-logs'],
    ['POST', '/api/system/seed?force=true'],
  ] as const;

  for (const [method, path] of privateEndpoints) {
    it(`${method} ${path} rejects anonymous callers`, async () => {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
      const body = await response.json();

      assert.equal(response.status, 403);
      assert.equal(body.code, 'FORBIDDEN');
    });
  }

  it('rejects tenant admins from company-wide system data', () => {
    let statusCode = 200;
    let nextCalled = false;
    const req = {
      auth: { role: 'tenant_admin', tenantId: 7 },
    } as unknown as AuthenticatedRequest;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;

    requireCompanyAdmin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it('allows company admins through the system-data guard', () => {
    let nextCalled = false;
    const req = {
      auth: { role: 'company_admin', email: 'admin@example.com' },
    } as unknown as AuthenticatedRequest;

    requireCompanyAdmin(req, {} as Response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });
});