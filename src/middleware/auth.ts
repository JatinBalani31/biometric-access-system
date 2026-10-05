import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { findOne, getDoc, collections } from '../db/firestore.ts';
import { Device, DeviceSecret, Tenant, CompanyAdmin } from '../db/models.ts';
import { AuthContext, ErrorResponse } from '../types/api.ts';
import { canTenant, tenantRoles, TenantAction, TenantResource, TenantRole } from '../lib/permissions.ts';

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

/**
 * The `x-simulated-role` headers below grant any caller an arbitrary role with no
 * credential whatsoever. That is a total authentication bypass, so it is opt-in and
 * off by default: a deployed environment that never sets ALLOW_SIMULATED_AUTH cannot
 * be talked into honouring the header, no matter what the caller sends.
 */
const SIMULATED_AUTH_ENABLED = process.env.ALLOW_SIMULATED_AUTH === 'true';

if (SIMULATED_AUTH_ENABLED) {
  console.warn(
    '[auth] ALLOW_SIMULATED_AUTH=true — x-simulated-role headers are honoured. ' +
    'This bypasses all authentication and must never be set in production.'
  );
}

async function findDeviceByToken(token: string): Promise<Device | null> {
  const secret = await findOne<DeviceSecret>(collections.deviceSecrets, 'deviceToken', token);
  if (secret) {
    const device = await getDoc<Device>(collections.devices, secret.id);
    return device?.tenantId === secret.tenantId ? device : null;
  }
  return findOne<Device>(collections.devices, 'deviceToken', token);
}

/**
 * Universal Authentication & Role Discovery Middleware
 * Handles:
 * 1. Device Token (x-device-token or Bearer dev_...)
 * 2. Firebase ID Tokens
 * 3. Simulated Dev Role headers for testing and API sandbox
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const deviceTokenHeader = req.headers['x-device-token'] as string | undefined;
    const simulatedRole = req.headers['x-simulated-role'] as string | undefined;
    const simulatedTenantId = req.headers['x-simulated-tenant-id'] as string | undefined;
    const simulatedEmail = req.headers['x-simulated-email'] as string | undefined;

    // 1. Check for Device Token Authentication (Kiosk Devices)
    let deviceToken = deviceTokenHeader;
    if (!deviceToken && authHeader && authHeader.startsWith('Bearer dev_')) {
      deviceToken = authHeader.replace('Bearer ', '').trim();
    } else if (!deviceToken && authHeader && authHeader.startsWith('Device ')) {
      deviceToken = authHeader.replace('Device ', '').trim();
    }

    if (deviceToken) {
      const matchedDevice = await findDeviceByToken(deviceToken);
      const tenant = matchedDevice ? await getDoc<Tenant>(collections.tenants, matchedDevice.tenantId) : null;

      if (!matchedDevice || matchedDevice.status === 'revoked') {
        const errorRes: ErrorResponse = {
          error: 'Invalid or revoked device token',
          code: 'INVALID_DEVICE_TOKEN',
        };
        return res.status(401).json(errorRes);
      }

      if (!tenant || tenant.status === 'suspended') {
        const errorRes: ErrorResponse = {
          error: 'Tenant subscription is suspended. Device access denied.',
          code: 'TENANT_SUSPENDED',
        };
        return res.status(403).json(errorRes);
      }

      req.auth = {
        role: 'device',
        tenantId: matchedDevice.tenantId,
        tenantName: tenant.companyName,
        tenantStatus: tenant.status,
        deviceId: matchedDevice.id,
        deviceName: matchedDevice.deviceName,
      };

      return next();
    }

    // 2. Check Simulated Testing Role Header (local sandbox only — see SIMULATED_AUTH_ENABLED)
    if (simulatedRole && SIMULATED_AUTH_ENABLED) {
      if (simulatedRole === 'company_admin') {
        req.auth = {
          role: 'company_admin',
          email: simulatedEmail || 'superadmin@platform.io',
          uid: 'superadmin-mock-uid',
        };
        return next();
      }

      if (simulatedRole === 'tenant_admin') {
        const tenantId = simulatedTenantId ? parseInt(simulatedTenantId, 10) : 1;
        const requestedTenantRole = req.headers['x-simulated-tenant-role'] as string | undefined;
        const tenantRole = tenantRoles.includes(requestedTenantRole as TenantRole)
          ? (requestedTenantRole as TenantRole)
          : 'owner';
        const tenant = await getDoc<Tenant>(collections.tenants, tenantId);

        if (!tenant) {
          return res.status(404).json({
            error: `Tenant with ID ${tenantId} not found`,
            code: 'NOT_FOUND',
          });
        }

        if (tenant.status === 'suspended') {
          const errorRes: ErrorResponse = {
            error: 'Tenant is suspended. Access restricted.',
            code: 'TENANT_SUSPENDED',
          };
          return res.status(403).json(errorRes);
        }

        req.auth = {
          role: 'tenant_admin',
          tenantId: tenant.id,
          tenantName: tenant.companyName,
          tenantStatus: tenant.status,
          tenantRole,
          email: simulatedEmail || `admin@${tenant.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          uid: `tenant-admin-${tenantId}-uid`,
        };
        return next();
      }

      if (simulatedRole === 'device') {
        const tenantId = simulatedTenantId ? parseInt(simulatedTenantId, 10) : 1;
        const tenant = await getDoc<Tenant>(collections.tenants, tenantId);

        if (!tenant || tenant.status === 'suspended') {
          return res.status(403).json({
            error: 'Tenant is suspended',
            code: 'TENANT_SUSPENDED',
          });
        }

        req.auth = {
          role: 'device',
          tenantId: tenant.id,
          tenantName: tenant.companyName,
          tenantStatus: tenant.status,
          deviceId: 999,
          deviceName: 'Simulated Kiosk Gateway',
        };
        return next();
      }
    }

    // 3. Check Firebase ID Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();

      // Check if it's a known device token passed in standard Bearer
      const matchedDevice = await findDeviceByToken(token);

      if (matchedDevice) {
        if (matchedDevice.status === 'revoked') {
          return res.status(401).json({
            error: 'Device token has been revoked',
            code: 'INVALID_DEVICE_TOKEN',
          });
        }

        const tenant = await getDoc<Tenant>(collections.tenants, matchedDevice.tenantId);

        if (!tenant || tenant.status === 'suspended') {
          return res.status(403).json({
            error: 'Tenant is suspended',
            code: 'TENANT_SUSPENDED',
          });
        }

        req.auth = {
          role: 'device',
          tenantId: matchedDevice.tenantId,
          tenantName: tenant.companyName,
          tenantStatus: tenant.status,
          deviceId: matchedDevice.id,
          deviceName: matchedDevice.deviceName,
        };
        return next();
      }

      // Try Firebase Token verification
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = decoded.email || '';
        const uid = decoded.uid;

        // A custom claim is signed into the token by Firebase, so it is authoritative
        // and saves a Firestore read on every request. The collection lookups below
        // remain as a fallback for accounts provisioned before claims were set.
        const claimedRole = decoded.role as string | undefined;
        const claimedTenantId = decoded.tenantId as number | undefined;
        const claimedTenantRole = decoded.tenantRole as string | undefined;

        if (claimedRole === 'company_admin') {
          req.auth = { role: 'company_admin', email, uid };
          return next();
        }

        if (claimedRole === 'tenant_admin') {
          if (
            typeof claimedTenantId !== 'number' ||
            !Number.isInteger(claimedTenantId) ||
            !tenantRoles.includes(claimedTenantRole as TenantRole)
          ) {
            return res.status(403).json({
              error: 'Tenant access requires valid role, tenantId, and tenantRole claims.',
              code: 'TENANT_CLAIMS_REQUIRED',
            });
          }

          const tenant = await getDoc<Tenant>(collections.tenants, claimedTenantId);

          if (!tenant || tenant.status === 'suspended') {
            return res.status(403).json({
              error: 'Tenant subscription is suspended',
              code: 'TENANT_SUSPENDED',
            });
          }

          req.auth = {
            role: 'tenant_admin',
            tenantId: claimedTenantId,
            tenantName: tenant.companyName,
            tenantStatus: tenant.status,
            tenantRole: claimedTenantRole as TenantRole,
            email,
            uid,
          };
          return next();
        }

        // Check if Company Admin
        const compAdmin = await findOne<CompanyAdmin>(collections.companyAdmins, 'email', email);

        if (compAdmin) {
          req.auth = {
            role: 'company_admin',
            email,
            uid,
          };
          return next();
        }

        // Fallback default for signed-in user if not explicitly mapped
        req.auth = {
          role: 'anonymous',
          email,
          uid,
        };
        return next();
      } catch (err) {
        console.warn('Firebase token verification failed or invalid token format:', err);
        return res.status(401).json({
          error: 'Unauthorized: Invalid Firebase token or Device Token',
          code: 'UNAUTHORIZED',
        });
      }
    }

    // Default to anonymous if no headers provided
    req.auth = {
      role: 'anonymous',
    };
    return next();
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'INTERNAL_ERROR',
      details: error.message,
    });
  }
}

/**
 * Enforce Company Admin role (Platform Superadmin)
 */
export function requireCompanyAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth || req.auth.role !== 'company_admin') {
    const errorRes: ErrorResponse = {
      error: 'Forbidden: Requires company_admin privileges',
      code: 'FORBIDDEN',
    };
    return res.status(403).json(errorRes);
  }
  next();
}

/**
 * Enforce Tenant Admin or Company Admin
 */
export function requireTenantAdminOrCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth || (req.auth.role !== 'tenant_admin' && req.auth.role !== 'company_admin')) {
    const errorRes: ErrorResponse = {
      error: 'Forbidden: Requires tenant_admin or company_admin privileges',
      code: 'FORBIDDEN',
    };
    return res.status(403).json(errorRes);
  }
  next();
}

export function requireTenantPermission(resource: TenantResource, action: TenantAction) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.auth?.role === 'company_admin') return next();

    const { tenantId, tenantRole } = req.auth ?? {};
    if (
      req.auth?.role !== 'tenant_admin' ||
      !Number.isInteger(tenantId) ||
      !canTenant(tenantRole, resource, action)
    ) {
      const errorRes: ErrorResponse = {
        error: `Forbidden: ${resource} ${action} permission required`,
        code: 'FORBIDDEN',
      };
      return res.status(403).json(errorRes);
    }

    next();
  };
}

export function requireDeviceOrTenantPermission(resource: TenantResource, action: TenantAction) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.auth?.role === 'device') return next();
    return requireTenantPermission(resource, action)(req, res, next);
  };
}

/**
 * Enforce Device or Tenant Admin access (e.g. for sync and embedding queries)
 */
export function requireDeviceOrTenantAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (
    !req.auth ||
    (req.auth.role !== 'device' && req.auth.role !== 'tenant_admin' && req.auth.role !== 'company_admin')
  ) {
    const errorRes: ErrorResponse = {
      error: 'Unauthorized: Device token or tenant admin credentials required',
      code: 'UNAUTHORIZED',
    };
    return res.status(401).json(errorRes);
  }
  next();
}

/**
 * Helper to get the effective tenant ID for the request.
 * - For tenant_admin and device: strictly returns req.auth.tenantId
 * - For company_admin: can override via query or body param, otherwise defaults to 1
 */
export function resolveTenantId(req: AuthenticatedRequest): number | null {
  if (!req.auth) return null;
  if (req.auth.role === 'tenant_admin' || req.auth.role === 'device') {
    return req.auth.tenantId ?? null;
  }
  if (req.auth.role === 'company_admin') {
    const paramId = req.query.tenant_id || req.body.tenant_id || req.params.tenantId;
    if (paramId) {
      const parsed = parseInt(String(paramId), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return req.auth.tenantId ?? null; // Null means all tenants for company admin
  }
  return null;
}
