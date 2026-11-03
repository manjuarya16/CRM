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
  const headerSlug = req.headers['x-tenant-slug'] || req.headers['x-organization-slug'];
  if (typeof headerSlug === 'string' && headerSlug.trim()) {
    return headerSlug.trim().toLowerCase();
  }

  // 2. Query param
  if (req.query?.slug && typeof req.query.slug === 'string' && req.query.slug.trim()) {
    return req.query.slug.trim().toLowerCase();
  }

  const reservedSubdomains = new Set(['localhost', 'www', 'admin', 'superadmin', 'super-admin', 'dev', 'staging', 'api', 'portal', 'crm', 'app']);

  // 3. From Origin or Referer header (e.g. http://acme.localhost:5173 or https://acme.dev.morsecrm.com)
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || '';
  if (origin) {
    try {
      const url = new URL(origin);
      const host = url.hostname;
      const parts = host.split('.');
      if (parts.length > 1 && !reservedSubdomains.has(parts[0].toLowerCase())) {
        return parts[0].toLowerCase();
      }
    } catch {
      // ignore invalid URL
    }
  }

  // 4. From direct Host header
  const host = req.headers.host || '';
  if (host) {
    const hostname = host.split(':')[0]; // strip port
    const parts = hostname.split('.');
    if (parts.length > 1 && !reservedSubdomains.has(parts[0].toLowerCase())) {
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
    const headerId = req.headers['x-tenant-id'] || req.headers['x-organization-id'] || req.query?.tenant_id;
    let rows: ITenant[] = [];

    if (slug) {
      const resSlug = await pool.query<ITenant>(
        'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE slug = $1 LIMIT 1',
        [slug]
      );
      rows = resSlug.rows;
    } else if (headerId && Number(headerId) > 0) {
      const resId = await pool.query<ITenant>(
        'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE id = $1 LIMIT 1',
        [Number(headerId)]
      );
      rows = resId.rows;
    }

    if (rows.length === 0) {
      const userTenantId = (req as any).user?.tenant_id;
      if (userTenantId) {
        const resUser = await pool.query<ITenant>(
          'SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE id = $1 LIMIT 1',
          [userTenantId]
        );
        rows = resUser.rows;
      }
    }

    if (rows.length === 0) {
      const fallbackRes = await pool.query<ITenant>(
        "SELECT id, name, slug, domain, status, plan, logo_url, settings FROM public.saas_tenants WHERE status = 'active' ORDER BY (id = 101) DESC, id ASC LIMIT 1"
      );
      rows = fallbackRes.rows;
    }

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No tenant organization found. Please check your workspace URL.',
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
