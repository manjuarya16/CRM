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
      `SELECT id, name, slug, domain, status, plan, logo_url, settings, created_at, updated_at 
       FROM public.saas_tenants 
       WHERE id = $1 LIMIT 1`,
      [tenantId]
    );

    if (tenantRes.rows.length === 0) return null;
    const tenant = tenantRes.rows[0];
    const settings = tenant.settings || {};

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
      plan: tenant.plan,
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

/**
 * GET /api/tenant/current (and /me)
 * Returns the currently authenticated tenant organization's profile
 */
router.get(['/current', '/me'], requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenant_id || req.tenant?.id;
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
    const tenantId = req.user?.tenant_id || req.tenant?.id;
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
