export interface SubdomainInfo {
  type: 'root' | 'admin' | 'tenant';
  slug?: string;
  host: string;
}

/**
 * Parses the current window hostname (or URL search params / path) to determine if the user is on:
 * - Root/landing ('root') e.g. localhost:5173, yourcrm.com, www.yourcrm.com
 * - Super Admin portal ('admin') e.g. admin.localhost:5173, admin.yourcrm.com, /super-admin
 * - Specific Tenant Workspace ('tenant') e.g. default.localhost:5173, acme.localhost:5173, ?tenant=acme
 */
export function getSubdomain(): SubdomainInfo {
  if (typeof window === 'undefined') {
    return { type: 'root', host: 'localhost' };
  }

  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname.toLowerCase();

  // Explicit URL query param support: e.g. ?tenant=default or ?tenant=acme
  const queryTenant = searchParams.get('tenant')?.toLowerCase().trim();
  if (queryTenant) {
    sessionStorage.setItem('active_tenant_slug', queryTenant);
    return { type: 'tenant', slug: queryTenant, host: hostname };
  }

  // Path-based Super Admin: e.g. /super-admin
  if (path.startsWith('/super-admin')) {
    return { type: 'admin', host: hostname };
  }

  // Localhost development: e.g. "default.localhost", "acme.localhost", "admin.localhost"
  if (hostname.includes('localhost') || hostname === '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      const sub = parts[0];
      if (sub === 'admin') {
        return { type: 'admin', host: hostname };
      }
      return { type: 'tenant', slug: sub, host: hostname };
    }

    // Check if a tenant was previously selected in this session on plain localhost
    const savedTenant = sessionStorage.getItem('active_tenant_slug');
    if (savedTenant && path !== '/' && !path.startsWith('/finder')) {
      return { type: 'tenant', slug: savedTenant, host: hostname };
    }

    return { type: 'root', host: hostname };
  }

  // Production domain: e.g. "acme.yourcrm.com" or "admin.yourcrm.com"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub === 'www') {
      return { type: 'root', host: hostname };
    }
    if (sub === 'admin') {
      return { type: 'admin', host: hostname };
    }
    return { type: 'tenant', slug: sub, host: hostname };
  }

  return { type: 'root', host: hostname };
}

/**
 * Builds the full URL for a given tenant workspace based on the current environment.
 */
export function buildTenantUrl(slug: string, path: string = '/login'): string {
  if (typeof window === 'undefined') return path;
  const { protocol, host } = window.location;
  const port = window.location.port ? `:${window.location.port}` : '';

  if (host.includes('localhost')) {
    return `${protocol}//${slug}.localhost${port}${path}`;
  }

  const parts = window.location.hostname.split('.');
  if (parts.length >= 3) {
    parts[0] = slug;
    return `${protocol}//${parts.join('.')}${port}${path}`;
  }

  return `${protocol}//${slug}.${window.location.hostname}${port}${path}`;
}

/**
 * Builds the Super Admin portal URL based on the current environment.
 */
export function buildSuperAdminUrl(path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  const { protocol, host } = window.location;
  const port = window.location.port ? `:${window.location.port}` : '';

  if (host.includes('localhost')) {
    return `${protocol}//admin.localhost${port}${path}`;
  }

  const parts = window.location.hostname.split('.');
  if (parts.length >= 3) {
    parts[0] = 'admin';
    return `${protocol}//${parts.join('.')}${port}${path}`;
  }

  return `${protocol}//admin.${window.location.hostname}${port}${path}`;
}
