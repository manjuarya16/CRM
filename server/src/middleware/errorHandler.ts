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
    res.status(400).json({ message: 'Validation error', errors: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  const errorMsg = (err as any)?.message || 'Internal server error';
  res.status(500).json({ success: false, message: errorMsg, error: errorMsg });
}
