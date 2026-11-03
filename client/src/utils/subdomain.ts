export interface SubdomainInfo {
  type: 'root' | 'admin' | 'tenant';
  slug?: string;
  host: string;
}

/**
 * Resolves the base root platform domain for tenant and admin routing.
 * Handles:
 * - Localhost: "localhost" -> returns "localhost"
 * - Multi-level dev/staging: "dev.morsecrm.com", "admin.dev.morsecrm.com", "tenant.dev.morsecrm.com" -> returns "dev.morsecrm.com"
 * - Production: "morsecrm.com", "admin.morsecrm.com", "tenant.morsecrm.com" -> returns "morsecrm.com"
 */
export function getBasePlatformDomain(customHostname?: string): string {
  if (typeof window === 'undefined' && !customHostname) return 'localhost';
  const hostname = (customHostname || window.location.hostname).toLowerCase().split(':')[0];

  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
    return 'localhost';
  }

  // Pure IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  // Check for dev.morsecrm.com or staging.morsecrm.com
  if (hostname === 'dev.morsecrm.com' || hostname.endsWith('.dev.morsecrm.com')) {
    return 'dev.morsecrm.com';
  }
  if (hostname === 'staging.morsecrm.com' || hostname.endsWith('.staging.morsecrm.com')) {
    return 'staging.morsecrm.com';
  }

  const parts = hostname.split('.');

  // If prefixed by admin / portal / superadmin, remove prefix
  const adminPrefixes = ['admin', 'superadmin', 'super-admin', 'portal', 'api', 'app'];
  if (parts.length >= 3 && adminPrefixes.includes(parts[0])) {
    return parts.slice(1).join('.');
  }

  // If hostname is e.g. "tenant.morsecrm.com"
  if (parts.length === 3) {
    if (parts[0] === 'dev' || parts[0] === 'staging') {
      return hostname;
    }
    return parts.slice(1).join('.');
  }

  if (parts.length >= 4) {
    if (parts[1] === 'dev' || parts[1] === 'staging') {
      return parts.slice(1).join('.');
    }
    return parts.slice(parts.length - 2).join('.');
  }

  return hostname;
}

/**
 * Returns the full hostname string for a given tenant slug (e.g. "acme.dev.morsecrm.com").
 */
export function getTenantDisplayDomain(slug: string): string {
  if (typeof window === 'undefined') return `${slug}.localhost`;
  const port = window.location.port ? `:${window.location.port}` : '';
  const baseDomain = getBasePlatformDomain();
  if (baseDomain === 'localhost') {
    return `${slug}.localhost${port}`;
  }
  return `${slug}.${baseDomain}${port}`;
}

/**
 * Parses the current window hostname (or URL search params / path) to determine if the user is on:
 * - Root/landing ('root') e.g. localhost:5173, dev.morsecrm.com, yourcrm.com
 * - Super Admin portal ('admin') e.g. admin.localhost:5173, admin.dev.morsecrm.com, /super-admin
 * - Specific Tenant Workspace ('tenant') e.g. default.dev.morsecrm.com, ?tenant=acme
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
  if (path.startsWith('/super-admin') || path.startsWith('/admin')) {
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
    const savedTenant = sessionStorage.getItem('active_tenant_slug') || localStorage.getItem('active_tenant_slug');
    if (savedTenant && path !== '/' && !path.startsWith('/finder')) {
      return { type: 'tenant', slug: savedTenant, host: hostname };
    }

    return { type: 'root', host: hostname };
  }

  // Check dev.morsecrm.com or staging.morsecrm.com
  if (hostname === 'dev.morsecrm.com' || hostname === 'staging.morsecrm.com') {
    const savedTenant = sessionStorage.getItem('active_tenant_slug') || localStorage.getItem('active_tenant_slug');
    if (savedTenant && path !== '/' && !path.startsWith('/finder') && !path.startsWith('/super-admin')) {
      return { type: 'tenant', slug: savedTenant, host: hostname };
    }
    return { type: 'root', host: hostname };
  }

  // Production or multi-part domain: e.g. "acme.dev.morsecrm.com" or "acme.morsecrm.com"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    // Known root/platform subdomains (www, dev, crm, app)
    if (sub === 'www' || sub === 'crm' || sub === 'app') {
      const savedTenant = sessionStorage.getItem('active_tenant_slug') || localStorage.getItem('active_tenant_slug');
      if (savedTenant && path !== '/' && !path.startsWith('/finder') && !path.startsWith('/super-admin')) {
        return { type: 'tenant', slug: savedTenant, host: hostname };
      }
      return { type: 'root', host: hostname };
    }
    if (sub === 'admin' || sub === 'superadmin') {
      return { type: 'admin', host: hostname };
    }
    return { type: 'tenant', slug: sub, host: hostname };
  }

  return { type: 'root', host: hostname };
}

/**
 * Builds the full URL for a given tenant workspace based on the current environment.
 */
export function buildTenantUrl(slug: string, path: string = '/login', queryParams?: Record<string, string>): string {
  if (typeof window === 'undefined') return path;
  const { protocol, port: winPort } = window.location;
  const port = winPort ? `:${winPort}` : '';
  const baseDomain = getBasePlatformDomain();

  let baseUrl = '';

  if (baseDomain === 'localhost') {
    baseUrl = `${protocol}//${slug}.localhost${port}${path}`;
  } else {
    baseUrl = `${protocol}//${slug}.${baseDomain}${port}${path}`;
  }

  const searchParams = new URLSearchParams(queryParams || {});
  const qs = searchParams.toString();
  if (qs) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}${qs}`;
  }

  return baseUrl;
}

/**
 * Builds the Super Admin portal URL based on the current environment.
 */
export function buildSuperAdminUrl(path: string = '/'): string {
  if (typeof window === 'undefined') return path;
  const { protocol, port: winPort } = window.location;
  const port = winPort ? `:${winPort}` : '';
  const baseDomain = getBasePlatformDomain();

  if (baseDomain === 'localhost') {
    return `${protocol}//admin.localhost${port}${path}`;
  }
  return `${protocol}//admin.${baseDomain}${port}${path}`;
}
