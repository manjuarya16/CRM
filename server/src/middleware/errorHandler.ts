import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '@/utils/logger';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    res.status(400).json({ message: details ? `Validation error (${details})` : 'Validation error', errors: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  const pgErr = err as any;
  if (pgErr?.code === '23505') {
    const detail = pgErr.detail || '';
    const constraint = pgErr.constraint || '';
    let userMsg = 'A record with this unique value already exists.';

    if (constraint.includes('organizations_name_key') || detail.includes('organizations') || detail.includes('name')) {
      userMsg = 'An organization with this name already exists. Please choose a different name.';
    } else if (constraint.includes('users_email_key') || detail.includes('email')) {
      userMsg = 'A user with this email address already exists.';
    }

    res.status(400).json({ success: false, message: userMsg, error: userMsg });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  const errorMsg = (err as any)?.message || 'Internal server error';
  res.status(500).json({ success: false, message: errorMsg, error: errorMsg });
}
