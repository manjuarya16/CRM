import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Super Admin authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    if (!decoded.is_super_admin) {
      res.status(403).json({ success: false, message: 'Access denied: Super Admin privileges required' });
      return;
    }
    (req as any).superAdmin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired Super Admin token' });
  }
}
