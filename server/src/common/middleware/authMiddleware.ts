import type { Request, Response, NextFunction } from 'express';

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  next();
}
