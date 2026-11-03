import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '@/config/db';
import { requireAuth } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Helper to fetch tenant profile with stats and admin user
 */
export async function getTenantProfile(tenantId: number) {
  const client = await pool.connect();
  try {
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, true), set_config('app.is_super_admin', 'true', true)`,
      [String(tenantId)]
    );

    const tenantRes = await client.query(
      `SELECT t.id, t.name, t.slug, t.domain, t.status, t.plan, t.logo_url, t.settings, t.created_at, t.updated_at,
              COALESCE(s.ends_at, (t.settings->>'subscription_expiry_date')::timestamptz) AS expiry_date,
              COALESCE(s.starts_at, (t.settings->>'subscription_start_date')::timestamptz, t.created_at) AS start_date,
              s.status AS sub_status,
              pt.name AS tier_name
       FROM public.saas_tenants t
       LEFT JOIN LATERAL (
         SELECT ends_at, starts_at, pricing_tier_id, status
           FROM public.platform_subscriptions
          WHERE tenant_id = t.id
          ORDER BY id DESC
          LIMIT 1
       ) s ON TRUE
       LEFT JOIN public.platform_pricing_tiers pt ON pt.id = s.pricing_tier_id
       WHERE t.id = $1 LIMIT 1`,
      [tenantId]
    );

    if (tenantRes.rows.length === 0) return null;
    const tenant = tenantRes.rows[0];
    const settings = tenant.settings || {};

    const now = new Date();
    const expiry = tenant.expiry_date ? new Date(tenant.expiry_date) : null;
    const isExpired = expiry ? expiry < now : false;
    let daysRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

    const planCode = (tenant.tier_name || tenant.plan || 'trial').toLowerCase();
    const isTrial =
      planCode.includes('trial') ||
      tenant.status === 'trial' ||
      tenant.sub_status === 'trialing' ||
      settings.is_trial === true ||
      Boolean(settings.custom_trial_days);

    if (isTrial && daysRemaining === null) {
      const created = tenant.created_at ? new Date(tenant.created_at) : now;
      const trialDuration = Number(settings.custom_trial_days) || 14;
      const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, trialDuration - elapsed);
    }

    let computedStatus = 'Active';
    if (tenant.status === 'suspended') {
      computedStatus = 'Suspended';
    } else if (isExpired) {
      computedStatus = 'Expired';
    } else if (isTrial) {
      computedStatus = 'Trial';
    }

    // Admin user
    const adminRes = await client.query(
      `SELECT id, name, email 
       FROM public.users 
       WHERE tenant_id = $1 
       ORDER BY id ASC 
       LIMIT 1`,
      [tenantId]
    );
    const admin = adminRes.rows[0] || null;

    // Stats
    const usersCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.users WHERE tenant_id = $1`,
      [tenantId]
    );
    const leadsCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.leads WHERE tenant_id = $1`,
      [tenantId]
    );
    const personsCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.persons WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      status: tenant.status,
      plan: tenant.tier_name || tenant.plan || 'Starter',
      is_trial: isTrial,
      trial_days_remaining: isTrial ? (daysRemaining ?? 14) : daysRemaining,
      computed_status: computedStatus,
      sub_status: tenant.sub_status || null,
      subscription_expiry_date: tenant.expiry_date || null,
      subscription_start_date: tenant.start_date || null,
      tier_name: tenant.tier_name || null,
      logo_url: tenant.logo_url || settings.logo_url || null,
      settings,
      email: settings.email || admin?.email || '',
      phone: settings.phone || '',
      website: settings.website || '',
      registration_no: settings.registration_no || '',
      established_date: settings.established_date || '',
      currency: settings.currency || 'INR',
      timezone: settings.timezone || 'Asia/Kolkata',
      address: settings.address || {
        street: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
      },
      admin,
      stats: {
        users: usersCountRes.rows[0]?.count || 0,
        leads: leadsCountRes.rows[0]?.count || 0,
        contacts: personsCountRes.rows[0]?.count || 0,
      },
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };
  } finally {
    client.release();
  }
}

async function resolveTenantId(req: Request): Promise<number | null> {
  const headerSlug = (req.headers['x-tenant-slug'] || req.headers['x-organization-slug'] || req.query.slug) as string;
  if (headerSlug && typeof headerSlug === 'string' && headerSlug.trim()) {
    const { rows } = await pool.query('SELECT id FROM public.saas_tenants WHERE slug = $1 LIMIT 1', [headerSlug.trim().toLowerCase()]);
    if (rows[0]) return rows[0].id;
  }

  const headerId = req.headers['x-tenant-id'] || req.headers['x-organization-id'] || req.query.tenant_id;
  if (headerId && Number(headerId) > 0) {
    return Number(headerId);
  }

  let tenantId = req.user?.tenant_id || req.tenant?.id;
  if (tenantId) return tenantId;

  const { rows } = await pool.query("SELECT id FROM public.saas_tenants WHERE status = 'active' ORDER BY (id = 101) DESC, id ASC LIMIT 1");
  return rows[0]?.id || null;
}

/**
 * GET /api/tenant/current (and /me)
 * Returns the currently authenticated tenant organization's profile
 */
router.get(['/current', '/me'], requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'No tenant context found' });
      return;
    }

    const profile = await getTenantProfile(tenantId);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Tenant organization not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch current tenant organization profile');
    next(err);
  }
});

/**
 * PUT /api/tenant/current (and /me)
 * Updates the currently authenticated tenant organization's profile
 */
router.put(['/current', '/me'], requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'No tenant context found' });
      return;
    }

    const {
      name,
      logo_url,
      domain,
      email,
      phone,
      website,
      registration_no,
      established_date,
      address,
      currency,
      timezone,
    } = req.body;

    // Fetch existing settings
    const existingRes = await pool.query(
      'SELECT settings, logo_url, name FROM public.saas_tenants WHERE id = $1',
      [tenantId]
    );

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Tenant organization not found' });
      return;
    }

    const currentSettings = existingRes.rows[0].settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(registration_no !== undefined ? { registration_no } : {}),
      ...(established_date !== undefined ? { established_date } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(address !== undefined ? { address: { ...(currentSettings.address || {}), ...address } } : {}),
      ...(logo_url !== undefined ? { logo_url } : {}),
    };

    const finalName = name && typeof name === 'string' && name.trim() ? name.trim() : existingRes.rows[0].name;
    const finalLogo = logo_url !== undefined ? logo_url : existingRes.rows[0].logo_url;

    await pool.query(
      `UPDATE public.saas_tenants 
       SET name = $1, 
           logo_url = $2, 
           domain = COALESCE($3, domain), 
           settings = $4::jsonb, 
           updated_at = NOW() 
       WHERE id = $5`,
      [finalName, finalLogo, domain || null, JSON.stringify(updatedSettings), tenantId]
    );

    // Sync admin logo in core_config if logo provided
    if (finalLogo) {
      try {
        await pool.query(
          `INSERT INTO public.core_config (code, value, channel, locale, tenant_id, updated_at)
           VALUES ('general.general.admin_logo.logo_image', $1, 'default', 'en', $2, NOW())
           ON CONFLICT DO NOTHING`,
          [finalLogo, tenantId]
        );
      } catch (e) {
        // non-critical
      }
    }

    const updatedProfile = await getTenantProfile(tenantId);
    res.json({
      success: true,
      message: 'Organization details updated successfully',
      data: updatedProfile,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to update current tenant organization profile');
    next(err);
  }
});

export default router;
