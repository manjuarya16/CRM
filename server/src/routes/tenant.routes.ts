import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '@/config/db';
import { requireAuth } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Helper to fetch tenant profile with stats and admin user
 */
export async function getTenantProfile(tenantId?: number) {
  const client = await pool.connect();
  try {
    let tenant: any = null;

    if (tenantId) {
      const tenantRes = await client.query(
        `SELECT id, name, slug, domain, status, plan, logo_url, settings, created_at, updated_at 
         FROM public.saas_tenants 
         WHERE id = $1 LIMIT 1`,
        [tenantId]
      );
      if (tenantRes.rows.length > 0) {
        tenant = tenantRes.rows[0];
      }
    }

    if (!tenant) {
      const fallbackRes = await client.query(
        `SELECT id, name, slug, domain, status, plan, logo_url, settings, created_at, updated_at 
         FROM public.saas_tenants 
         ORDER BY id ASC LIMIT 1`
      );
      if (fallbackRes.rows.length > 0) {
        tenant = fallbackRes.rows[0];
      }
    }

    if (!tenant) {
      // If saas_tenants is empty, synthesize from organizations table
      const orgRes = await client.query(
        `SELECT id, name, address, created_at, updated_at FROM public.organizations ORDER BY id ASC LIMIT 1`
      );
      const org = orgRes.rows[0] || { id: 1, name: 'Default Organization', address: {} };
      tenant = {
        id: org.id,
        name: org.name,
        slug: 'default',
        domain: null,
        status: 'active',
        plan: 'enterprise',
        logo_url: null,
        settings: typeof org.address === 'object' && org.address ? org.address : {},
        created_at: org.created_at || new Date().toISOString(),
        updated_at: org.updated_at || new Date().toISOString(),
      };
    }

    const settings = tenant.settings || {};

    // Admin user
    const adminRes = await client.query(
      `SELECT id, name, email 
       FROM public.users 
       ORDER BY id ASC 
       LIMIT 1`
    );
    const admin = adminRes.rows[0] || null;

    // Stats
    const usersCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.users`
    );
    const leadsCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.leads`
    );
    const personsCountRes = await client.query(
      `SELECT COUNT(*)::int as count FROM public.persons`
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
    const tenantId = (req as any).user?.tenant_id || (req as any).tenant?.id || 1;
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
    const tenantId = (req as any).user?.tenant_id || (req as any).tenant?.id || 1;

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
    let existingRes = await pool.query(
      'SELECT settings, logo_url, name FROM public.saas_tenants WHERE id = $1',
      [tenantId]
    );

    if (existingRes.rows.length === 0) {
      existingRes = await pool.query(
        'SELECT settings, logo_url, name FROM public.saas_tenants ORDER BY id ASC LIMIT 1'
      );
    }

    const currentSettings = existingRes.rows[0]?.settings || {};
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

    const finalName = name && typeof name === 'string' && name.trim() ? name.trim() : existingRes.rows[0]?.name || 'Organization';
    const finalLogo = logo_url !== undefined ? logo_url : existingRes.rows[0]?.logo_url;

    if (existingRes.rows.length > 0) {
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
    }

    // Sync admin logo in core_config if logo provided
    if (finalLogo) {
      try {
        await pool.query(
          `INSERT INTO public.core_config (code, value, channel, locale, updated_at)
           VALUES ('general.general.admin_logo.logo_image', $1, 'default', 'en', NOW())
           ON CONFLICT (code) DO UPDATE SET value = EXCLUDED.value`,
          [finalLogo]
        );
      } catch (e) {
        // non-critical
      }
    }

    // Sync name to organizations table
    try {
      await pool.query(
        `UPDATE public.organizations 
         SET name = $1, address = $2::jsonb, updated_at = NOW() 
         WHERE id = 1`,
        [finalName, JSON.stringify(updatedSettings)]
      );
    } catch (e) {
      // non-critical
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
