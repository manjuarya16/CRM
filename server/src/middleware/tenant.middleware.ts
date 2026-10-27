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
  // 1. Explicit custom header from API client (if provided)
  const headerSlug = req.headers['x-tenant-slug'];
  if (typeof headerSlug === 'string' && headerSlug.trim()) {
    return headerSlug.trim().toLowerCase();
  }

  // 2. From Origin or Referer header (e.g. https://acme.imorse.digital)
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || '';
  if (origin) {
    try {
      const url = new URL(origin);
      const host = url.hostname;
      const parts = host.split('.');
      if (parts.length > 2) {
        return parts[0].toLowerCase();
      }
    } catch {
      // ignore
    }
  }

  // 3. From direct Host header
  const host = req.headers.host || '';
  if (host) {
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length > 2) {
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
    const targetSlug = slug || 'default';

    let tenant: ITenant | null = null;
    const { rows } = await pool.query<ITenant>(
      'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE slug = $1 LIMIT 1',
      [targetSlug]
    );

    if (rows.length > 0) {
      tenant = rows[0];
    } else {
      // Fallback: get first tenant or default tenant
      const fallback = await pool.query<ITenant>(
        'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants ORDER BY id ASC LIMIT 1'
      );
      if (fallback.rows.length > 0) {
        tenant = fallback.rows[0];
      } else {
        tenant = {
          id: 1,
          name: 'Default Organization',
          slug: 'default',
          status: 'active',
          plan: 'enterprise',
          settings: {},
        };
      }
    }

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
