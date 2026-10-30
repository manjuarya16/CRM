import { Router } from 'express';
import { pool } from '@/config/db';

const router = Router();

router.get('/pricing', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, amount_cents, currency, billing_interval, features
         FROM public.platform_pricing_tiers
        WHERE active = TRUE
        ORDER BY amount_cents, name`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// Public: Get Tenant Information by slug for login page branding
router.get('/tenant/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();
    const { rows } = await pool.query(
      'SELECT id, name, slug, domain, status, plan, logo_url FROM public.saas_tenants WHERE slug = $1 LIMIT 1',
      [slug]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const tenant = rows[0];
    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        logo_url: tenant.logo_url,
        plan: tenant.plan,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
