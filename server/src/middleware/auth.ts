import { NextFunction, Request, Response } from 'express';
import { passport } from '@/config/passport';
import type { PublicUser } from '@/interfaces';
import { runWithTenantContext } from '@/context/tenantContext';

declare global {
  namespace Express {
    interface User extends PublicUser {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('jwt', { session: false }, (err: unknown, user: PublicUser | false) => {
    if (err) return next(err);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const isPlatformAdmin =
      user.role_id === 1 ||
      user.role === 'Administrator' ||
      user.tenant_id === 1 ||
      (user as any).is_super_admin === true;

    // Security: Verify user tenant belongs to current resolved tenant workspace (unless platform admin)
    if (!isPlatformAdmin && user.tenant_id && req.tenant && req.tenant.id !== user.tenant_id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this organization workspace.',
      });
      return;
    }

    req.user = user;
    const activeTenantId = (req.tenant?.id || user.tenant_id) ?? undefined;
    const activeSlug = req.tenant?.slug;

    runWithTenantContext(
      {
        tenantId: activeTenantId,
        tenantSlug: activeSlug,
        isSuperAdmin: isPlatformAdmin ? true : undefined,
      },
      () => {
        next();
      },
    );
  })(req, res, next);
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}
