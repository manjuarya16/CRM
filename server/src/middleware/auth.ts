import { NextFunction, Request, Response } from 'express';
import { passport } from '@/config/passport';
import type { PublicUser } from '@/interfaces';

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
    req.user = user;
    next();
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
