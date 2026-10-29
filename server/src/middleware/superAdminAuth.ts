import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { runWithTenantContext } from '@/context/tenantContext';
import { loadSuperAdminAccess } from '@/services/platformRoleAccess.service';

type SuperAdminIdentity = Awaited<ReturnType<typeof loadSuperAdminAccess>> & {
  sub: string;
  is_super_admin: true;
};
type SuperAdminRequest = Request & { superAdmin?: NonNullable<SuperAdminIdentity> };

const permissionCheck = (req: Request, permissions: string[]): boolean => {
  const identity = (req as SuperAdminRequest).superAdmin;
  if (!identity) return false;
  const assigned = new Set(identity.permissions);
  return permissions.some((permission) => assigned.has(permission));
};

const deny = (res: Response, message = 'Access denied for this platform role'): void => {
  res.status(403).json({ success: false, message });
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Super Admin authentication required' });
    return;
  }

  let decoded: jwt.JwtPayload;
  try {
    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string') throw new Error('Invalid token payload');
    decoded = payload;
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired Super Admin token' });
    return;
  }

  if (!decoded.is_super_admin || !decoded.sub) {
    deny(res, 'Access denied: Super Admin privileges required');
    return;
  }

  void loadSuperAdminAccess(decoded.sub).then((admin) => {
    if (!admin || admin.status !== 'active') {
      res.status(401).json({ success: false, message: 'Super Admin account is unavailable or deactivated' });
      return;
    }
    const identity = { ...admin, sub: String(admin.id), is_super_admin: true as const };
    (req as SuperAdminRequest).superAdmin = identity;
    runWithTenantContext({ isSuperAdmin: true }, () => next());
  }).catch(next);
};

export const requireSuperAdminPermission = (...permissions: string[]): RequestHandler =>
  (req, res, next) => {
    if (!permissionCheck(req, permissions)) {
      deny(res);
      return;
    }
    next();
  };

const actionForMethod = (method: string): string => {
  if (method === 'GET' || method === 'HEAD') return 'view';
  if (method === 'POST') return 'create';
  if (method === 'PATCH' || method === 'PUT') return 'edit';
  if (method === 'DELETE') return 'delete';
  return '';
};

const routeModule = (path: string): string | null => {
  if (/^\/platform-users(?:\/|$)/.test(path)) return 'users';
  if (/^\/platform-roles(?:\/|$)/.test(path)) return 'roles';
  if (/^\/tenants\/\d+\/subscriptions(?:\/|$)/.test(path) || path === '/subscriptions') return 'subscriptions';
  if (/^\/tenants\/\d+\/payments(?:\/|$)/.test(path) || path === '/payments') return 'payments';
  if (/^\/pricing-tiers(?:\/|$)/.test(path)) return 'pricing';
  if (/^\/notifications(?:\/|$)/.test(path)) return 'notifications';
  if (/^\/email-templates(?:\/|$)/.test(path)) return 'email_templates';
  if (/^\/smtp-config(?:\/|$)/.test(path)) return 'smtp';
  if (/^\/demo-requests(?:\/|$)/.test(path)) return 'demos';
  return null;
};

export const requirePlatformModulePermission: RequestHandler = (req, res, next) => {
  const path = req.path;
  const method = req.method.toUpperCase();
  if (/^\/demo-requests\/\d+\/activate-trial$/.test(path) && method === 'POST') {
    if (!permissionCheck(req, ['platform.demos.edit'])) {
      deny(res);
      return;
    }
    next();
    return;
  }
  if (path === '/subscription-plans' && method === 'GET') {
    if (!permissionCheck(req, ['platform.subscriptions.view', 'platform.demos.edit'])) {
      deny(res);
      return;
    }
    next();
    return;
  }
  if (path === '/platform-roles' && method === 'GET') {
    if (!permissionCheck(req, [
      'platform.roles.view',
      'platform.access_management.view',
      'platform.users.view',
    ])) {
      deny(res);
      return;
    }
    next();
    return;
  }

  if (/^\/platform-roles\/\d+$/.test(path) && method === 'PATCH' &&
      Object.prototype.hasOwnProperty.call(req.body || {}, 'permissions')) {
    const body = req.body as Record<string, unknown>;
    const permissionsOnly = Object.keys(body).every((key) => ['permissions', 'permission_type'].includes(key));
    const hasAccessManagementPermission = permissionCheck(req, ['platform.access_management.edit']);
    const hasRoleEditPermission = permissionsOnly || permissionCheck(req, ['platform.roles.edit']);
    if (!hasAccessManagementPermission || !hasRoleEditPermission) {
      deny(res);
      return;
    }
    next();
    return;
  }

  const module = routeModule(path);
  const action = actionForMethod(method);
  if (!module || !action || !permissionCheck(req, [`platform.${module}.${action}`])) {
    deny(res);
    return;
  }
  next();
};
