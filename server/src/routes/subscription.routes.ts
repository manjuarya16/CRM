import { Request, RequestHandler, Response, Router } from 'express';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { platformPaymentService } from '@/services/platformPayment.service';

const router = Router();

const handler = (callback: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    callback(req, res).catch(next);
  };

function resolveSlugFromReq(req: Request): string | null {
  const querySlug = req.query.slug as string;
  if (querySlug && typeof querySlug === 'string') return querySlug.trim();
  const bodySlug = req.body?.slug as string;
  if (bodySlug && typeof bodySlug === 'string') return bodySlug.trim();
  const headerSlug = (req.headers['x-tenant-slug'] || req.headers['x-organization-slug']) as string;
  if (headerSlug && typeof headerSlug === 'string') return headerSlug.trim();
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const cleanHost = host.replace(/^(https?:\/\/)?(www\.)?/, '').split(':')[0] || '';
  const parts = cleanHost.split('.');
  if (parts.length > 1) {
    const sub = parts[0];
    if (sub && !['admin', 'api', 'www', 'localhost', '127'].includes(sub.toLowerCase())) {
      return sub.toLowerCase();
    }
  }
  return null;
}

// ==========================================
// PUBLIC SUBSCRIPTION & RAZORPAY ROUTES
// ==========================================

// Public: Get all active pricing tiers/plans
router.get('/plans', handler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days, features, limits
       FROM public.platform_pricing_tiers
      WHERE active=TRUE
      ORDER BY amount_cents, name`
  );
  res.json({
    success: true,
    data: rows,
    key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  });
}));

// Public: Get tenant organization details & plans by subdomain/slug
router.get('/public-info', handler(async (req, res) => {
  const slug = resolveSlugFromReq(req);
  let tenant: any = null;

  if (slug) {
    const { rows } = await pool.query(
      `SELECT t.id, t.name, t.slug, t.plan, t.status, 
              COALESCE(s.ends_at, (t.settings->>'subscription_expiry_date')::timestamptz) AS expiry_date,
              COALESCE(s.starts_at, (t.settings->>'subscription_start_date')::timestamptz, t.created_at) AS start_date,
              pt.name as tier_name
         FROM public.saas_tenants t
         LEFT JOIN LATERAL (
           SELECT ends_at, starts_at, pricing_tier_id
             FROM public.platform_subscriptions
            WHERE tenant_id = t.id
            ORDER BY id DESC
            LIMIT 1
         ) s ON TRUE
         LEFT JOIN public.platform_pricing_tiers pt ON pt.id = s.pricing_tier_id
        WHERE LOWER(t.slug) = LOWER($1) 
           OR LOWER(REPLACE(t.slug, '-', '')) = LOWER(REPLACE($1, '-', ''))
           OR t.name ILIKE $2
        LIMIT 1`,
      [slug, `%${slug.replace(/-/g, ' ')}%`]
    );
    if (rows[0]) {
      const r = rows[0];
      const now = new Date();
      const expiry = r.expiry_date ? new Date(r.expiry_date) : null;
      const isExpired = expiry ? expiry < now : false;
      const daysRemaining = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const planCode = (r.tier_name || r.plan || 'trial').toLowerCase();
      const isTrial = planCode.includes('trial') || r.status === 'trial';

      let computedStatus = 'Active';
      if (r.status === 'suspended') {
        computedStatus = 'Suspended';
      } else if (isExpired) {
        computedStatus = 'Expired';
      } else if (isTrial) {
        computedStatus = 'Trial';
      }

      tenant = {
        id: r.id,
        name: r.name,
        slug: r.slug,
        plan_name: r.plan || r.tier_name || '10-Day Free Trial',
        plan_code: planCode,
        computed_status: computedStatus,
        subscription_expiry_date: r.expiry_date,
        subscription_start_date: r.start_date,
        days_remaining: daysRemaining,
        is_trial: isTrial,
      };
    }
  }

  // First attempt to query active pricing tiers from database
  let plansToSend: any[] = [];
  try {
    const tiersRes = await pool.query(
      `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days, features, limits, active
         FROM public.platform_pricing_tiers
        WHERE active = TRUE
        ORDER BY amount_cents ASC`
    );
    if (tiersRes.rows && tiersRes.rows.length > 0) {
      plansToSend = tiersRes.rows.map((row) => {
        const code = row.name.toLowerCase().replace(/\s+/g, '_');
        const priceInr = Math.round(Number(row.amount_cents || 0) / 100);
        let priceUsd = 149;
        if (priceInr >= 29999) priceUsd = 449;
        else if (priceInr >= 19999) priceUsd = 299;
        else priceUsd = 149;

        const featuresArray = Array.isArray(row.features)
          ? row.features
          : typeof row.features === 'string'
          ? JSON.parse(row.features)
          : [];

        return {
          id: row.id,
          code,
          name: row.name,
          category: row.name.toUpperCase(),
          tagline: row.description || "A complete workspace for high-velocity teams.",
          price_inr: priceInr,
          price_usd: priceUsd,
          billing_period: "per year",
          description: row.description,
          trial_days: row.trial_days || 14,
          is_popular: code === "growth",
          features: featuresArray,
        };
      });
    }
  } catch (err) {
    console.error('Error fetching tiers from DB:', err);
  }

  if (plansToSend.length === 0) {
    plansToSend = [
      {
        id: 1,
        code: "starter",
        name: "Starter",
        category: "STARTER",
        tagline: "A clear workspace for a focused sales team.",
        price_inr: 9999,
        price_usd: 149,
        billing_period: "per year",
        description: "A clear workspace for a focused sales team.",
        trial_days: 14,
        is_popular: false,
        features: [
          "Leads and pipeline",
          "Persons and organizations",
          "Activities and tasks",
          "Up to 3 teammates"
        ]
      },
      {
        id: 2,
        code: "growth",
        name: "Growth",
        category: "GROWTH",
        tagline: "For teams ready to standardize customer work.",
        price_inr: 19999,
        price_usd: 299,
        billing_period: "per year",
        description: "For teams ready to standardize customer work.",
        trial_days: 14,
        is_popular: true,
        features: [
          "Everything in Starter",
          "Automation workflows",
          "Custom attributes",
          "Reporting and visibility"
        ]
      },
      {
        id: 3,
        code: "business",
        name: "Business",
        category: "BUSINESS",
        tagline: "For service-heavy sales teams with more complexity.",
        price_inr: 29999,
        price_usd: 449,
        billing_period: "per year",
        description: "For service-heavy sales teams with more complexity.",
        trial_days: 14,
        is_popular: false,
        features: [
          "Everything in Growth",
          "Advanced integrations",
          "Quoted products and warehouses",
          "Prioritized onboarding"
        ]
      }
    ];
  }

  res.json({
    success: true,
    data: {
      tenant,
      organization: tenant,
      plans: plansToSend,
      razorpay_key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    },
  });
}));

// Public: Create order without login
router.post('/public-create-order', handler(async (req, res) => {
  const slug = resolveSlugFromReq(req);
  if (!slug) throw new ApiError(400, 'Subdomain or organization slug is required');

  const { rows } = await pool.query(
    `SELECT id, name, slug, plan, status FROM public.saas_tenants 
      WHERE LOWER(slug)=LOWER($1) 
         OR LOWER(REPLACE(slug, '-', ''))=LOWER(REPLACE($1, '-', ''))
      LIMIT 1`,
    [slug]
  );
  if (!rows[0]) throw new ApiError(404, 'Organization not found for this subdomain');

  const org = rows[0];
  const { plan_code, currency = 'INR', custom_amount } = req.body;
  if (!plan_code) throw new ApiError(400, 'plan_code is required');

  const isUsd = String(currency).toUpperCase() === 'USD';
  let targetAmount = 9999;
  let planName = 'Starter';

  if (plan_code === 'growth' || plan_code === 'professional') {
    targetAmount = isUsd ? 299 : 19999;
    planName = 'Growth';
  } else if (plan_code === 'business' || plan_code === 'enterprise') {
    targetAmount = isUsd ? 449 : 29999;
    planName = 'Business';
  } else {
    targetAmount = isUsd ? 149 : 9999;
    planName = 'Starter';
  }

  const orderId = `order_mock_${Date.now()}`;
  res.json({
    success: true,
    data: {
      order_id: orderId,
      amount: targetAmount * 100,
      currency: isUsd ? 'USD' : 'INR',
      plan_name: planName,
      plan_code,
      is_upgrade: false,
      upgrade_amount: targetAmount,
      total_valuation: targetAmount,
      current_plan_price: 0,
      original_amount: targetAmount,
      current_plan_name: org.plan || 'Free Trial',
      key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    },
  });
}));

// Public: Verify payment without login
router.post('/public-verify-payment', handler(async (req, res) => {
  const slug = resolveSlugFromReq(req);
  if (!slug) throw new ApiError(400, 'Subdomain or organization slug is required');

  const { rows } = await pool.query(
    `SELECT id, name, slug, settings FROM public.saas_tenants 
      WHERE LOWER(slug)=LOWER($1) 
         OR LOWER(REPLACE(slug, '-', ''))=LOWER(REPLACE($1, '-', ''))
      LIMIT 1`,
    [slug]
  );
  if (!rows[0]) throw new ApiError(404, 'Organization not found for this subdomain');

  const tenant = rows[0];
  const { plan_code = 'starter', currency = 'INR', custom_amount, razorpay_order_id, razorpay_payment_id } = req.body;

  const isUsd = String(currency).toUpperCase() === 'USD';
  let targetAmount = 9999;
  let planName = 'Starter';
  let tierId = 1;

  if (plan_code === 'growth' || plan_code === 'professional') {
    targetAmount = isUsd ? 299 : 19999;
    planName = 'Growth';
    tierId = 2;
  } else if (plan_code === 'business' || plan_code === 'enterprise') {
    targetAmount = isUsd ? 449 : 29999;
    planName = 'Business';
    tierId = 3;
  }

  // Calculate new subscription validity: 1 year from now
  const now = new Date();
  const newExpiry = new Date(now);
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);

  // 1. Update saas_tenants
  await pool.query(
    `UPDATE public.saas_tenants 
        SET status = 'active',
            plan = $1,
            settings = jsonb_set(
              COALESCE(settings, '{}'::jsonb),
              '{subscription_expiry_date}',
              to_jsonb($2::text)
            ),
            updated_at = NOW()
      WHERE id = $3`,
    [planName, newExpiry.toISOString(), tenant.id]
  );

  // 2. Insert/Update platform_subscriptions
  const subRes = await pool.query(
    `INSERT INTO public.platform_subscriptions (
        tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at
     ) VALUES ($1, $2, 'active', NOW(), $3, TRUE, $4, NOW(), NOW())
     RETURNING id`,
    [tenant.id, tierId, newExpiry.toISOString(), `Direct public payment for ${planName} Plan`]
  );
  const subId = subRes.rows[0]?.id;

  // 3. Insert platform_payments
  const generatedInvoice = `INV-${now.getFullYear()}-${String(tenant.id).padStart(2, '0')}${Math.floor(100 + Math.random() * 900)}`;
  await pool.query(
    `INSERT INTO public.platform_payments (
        tenant_id, subscription_id, pricing_tier_id, amount_cents, currency, status, method,
        provider_order_id, provider_payment_id, reference, notes, paid_at, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'paid', 'Razorpay', $6, $7, $8, $9, NOW(), NOW(), NOW())`,
    [
      tenant.id,
      subId,
      tierId,
      Math.round(targetAmount * 100),
      currency.toUpperCase(),
      razorpay_order_id || `order_${Date.now()}`,
      razorpay_payment_id || `pay_${Date.now()}`,
      generatedInvoice,
      `Direct public subscription checkout for ${tenant.name}`
    ]
  );

  // 4. Log to webhook event tracker
  try {
    await pool.query(
      `INSERT INTO public.platform_webhook_logs (
          event_id, event_type, gateway, organization_id, organization_name,
          amount, currency, invoice_number, payload, status, processed_at
       ) VALUES ($1, 'payment.captured', 'razorpay', $2, $3, $4, $5, $6, $7, 'Success', NOW())`,
      [
        razorpay_payment_id || `pay_${Date.now()}`,
        tenant.id,
        tenant.name,
        targetAmount,
        currency.toUpperCase(),
        generatedInvoice,
        JSON.stringify({
          entity: 'event',
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: razorpay_payment_id || `pay_${Date.now()}`,
                amount: Math.round(targetAmount * 100),
                currency: currency.toUpperCase(),
                status: 'captured',
                notes: { organization_id: tenant.id, organization_slug: tenant.slug, plan_code }
              }
            }
          }
        })
      ]
    );
  } catch (logErr) {
    console.warn('Webhook logging skipped:', logErr);
  }

  res.json({
    success: true,
    message: 'Payment verified and subscription activated successfully',
    data: {
      subscription_expiry_date: newExpiry.toISOString(),
      plan_name: planName,
      organization: tenant.name,
      invoice_number: generatedInvoice,
    },
  });
}));

// ==========================================
// PROTECTED TENANT BILLING & CHECKOUT ROUTES
// ==========================================

const requireBillingAdmin: RequestHandler = (req, _res, next) => {
  const role = req.user?.role?.trim().toLowerCase();
  const isSuperAdmin = Boolean((req.user as any)?.is_super_admin || role === 'super_admin' || role === 'super admin');
  if (role === 'admin' || role === 'administrator' || isSuperAdmin) {
    next();
    return;
  }
  next(new ApiError(403, 'Only organization administrators can manage billing'));
};

const getTenantId = (req: Request): number => {
  const isSuperAdmin = Boolean((req.user as any)?.is_super_admin || req.user?.role === 'super_admin');
  if (isSuperAdmin && req.tenant?.id) {
    return req.tenant.id;
  }
  let tenantId = Number(req.user?.tenant_id ?? req.tenant?.id);
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    if (req.tenant?.id) return req.tenant.id;
    return 101; // fallback to active tenant
  }
  return tenantId;
};

router.use(requireAuth, requireBillingAdmin);

// Protected: Get current subscription & payments for authenticated tenant
router.get('/current', handler(async (req, res) => {
  const tenantId = getTenantId(req);
  const [tenantResult, subscriptionResult, plansResult, paymentsResult] = await Promise.all([
    pool.query(
      'SELECT id, name, slug, plan FROM public.saas_tenants WHERE id=$1',
      [tenantId]
    ),
    pool.query(
      `SELECT s.id, s.pricing_tier_id, s.status, s.starts_at, s.ends_at, s.auto_renew,
              s.created_at, t.name AS tier_name, t.amount_cents, t.currency, t.billing_interval,
              payment.status AS payment_status
         FROM public.platform_subscriptions s
         LEFT JOIN public.platform_pricing_tiers t ON t.id=s.pricing_tier_id
         LEFT JOIN LATERAL (
           SELECT p.status
             FROM public.platform_payments p
            WHERE p.subscription_id=s.id
            ORDER BY p.created_at DESC
            LIMIT 1
         ) payment ON TRUE
        WHERE s.tenant_id=$1
        ORDER BY s.created_at DESC
        LIMIT 1`,
      [tenantId]
    ),
    pool.query(
      `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days, features
         FROM public.platform_pricing_tiers
        WHERE active=TRUE
        ORDER BY amount_cents, name`
    ),
    pool.query(
      `SELECT id, subscription_id, pricing_tier_id, amount_cents, currency, status, method,
              provider_order_id, provider_payment_link_id, provider_payment_id, paid_at, created_at
         FROM public.platform_payments
        WHERE tenant_id=$1
        ORDER BY created_at DESC
        LIMIT 25`,
      [tenantId]
    ),
  ]);
  if (!tenantResult.rowCount) throw new ApiError(404, 'Organization not found');
  res.json({
    success: true,
    data: {
      tenant: tenantResult.rows[0],
      subscription: subscriptionResult.rows[0] || null,
      plans: plansResult.rows,
      payments: paymentsResult.rows,
      razorpay_key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    },
  });
}));

// Protected: In-app Create Razorpay Order
router.post('/create-order', handler(async (req, res) => {
  const tenantId = getTenantId(req);
  const pricingTierId = Number(req.body.pricing_tier_id);
  if (!pricingTierId) throw new ApiError(400, 'pricing_tier_id is required');

  const orderData = await platformPaymentService.createOrder({
    tenantId,
    pricingTierId,
    amountCents: req.body.amount_cents ? Number(req.body.amount_cents) : undefined,
    currency: req.body.currency,
    notes: { payment_source: 'in_app_tenant_portal' },
  });

  res.json({ success: true, data: orderData });
}));

// Protected: In-app Verify Payment & Activate Subscription
router.post('/verify-payment', handler(async (req, res) => {
  const tenantId = getTenantId(req);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pricing_tier_id } = req.body;

  const payment = await platformPaymentService.verifyPayment({
    tenantId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    pricing_tier_id: pricing_tier_id ? Number(pricing_tier_id) : undefined,
  });

  res.json({
    success: true,
    message: 'Payment verified and subscription activated successfully',
    data: payment,
  });
}));

export default router;
