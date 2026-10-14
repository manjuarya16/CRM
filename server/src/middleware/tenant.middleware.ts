import { Request, Response, NextFunction } from 'express';
import { pool } from '@/config/db';
import { ITenant } from '@/interfaces';
import { runWithTenantContext } from '@/context/tenantContext';

declare global {
  namespace Express {
    interface Request {
      tenant?: ITenant;
    }
  }
}

/**
 * Extracts the tenant slug from header, origin, or host.
 */
export function extractTenantSlug(req: Request): string | null {
  // 1. Explicit custom header from API client (highest precedence)
  const headerSlug = req.headers['x-tenant-slug'];
  if (typeof headerSlug === 'string' && headerSlug.trim()) {
    return headerSlug.trim().toLowerCase();
  }

  // 2. From Origin or Referer header (e.g. http://acme.localhost:5173 or https://acme.yourcrm.com)
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || '';
  if (origin) {
    try {
      const url = new URL(origin);
      const host = url.hostname; // e.g. "acme.localhost" or "acme.yourcrm.com"
      const parts = host.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== 'admin') {
        return parts[0].toLowerCase();
      }
    } catch {
      // ignore invalid URL
    }
  }

  // 3. From direct Host header
  const host = req.headers.host || '';
  if (host) {
    const hostname = host.split(':')[0]; // strip port
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== 'admin') {
      return parts[0].toLowerCase();
    }
  }

  return null;
}

/**
 * Middleware that resolves tenant context and validates organization status.
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = extractTenantSlug(req);

    // If no slug is supplied, fall back to default tenant (id = 1, slug = 'default')
    const targetSlug = slug || 'default';

    const { rows } = await pool.query<ITenant>(
      'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE slug = $1 LIMIT 1',
      [targetSlug]
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: `Organization '${targetSlug}' does not exist. Please check your workspace URL.`,
      });
      return;
    }

    const tenant = rows[0];

    if (tenant.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'This organization account is currently suspended. Please contact support.',
      });
      return;
    }

    req.tenant = tenant;
    runWithTenantContext({ tenantId: tenant.id, tenantSlug: tenant.slug }, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
}
