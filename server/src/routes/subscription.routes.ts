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
      `SELECT id, name, slug, plan, status, settings->>'subscription_expiry_date' AS expiry_date
         FROM public.saas_tenants
        WHERE LOWER(slug)=LOWER($1)
        LIMIT 1`,
      [slug]
    );
    tenant = rows[0] || null;
  }

  const { rows: plans } = await pool.query(
    `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days, features
       FROM public.platform_pricing_tiers
      WHERE active=TRUE
      ORDER BY amount_cents, name`
  );

  res.json({
    success: true,
    data: {
      tenant,
      plans,
      razorpay_key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    },
  });
}));

// Public: Create order without login
router.post('/public-create-order', handler(async (req, res) => {
  const slug = resolveSlugFromReq(req);
  if (!slug) throw new ApiError(400, 'Subdomain or organization slug is required');

  const { rows } = await pool.query(
    `SELECT id FROM public.saas_tenants WHERE LOWER(slug)=LOWER($1) LIMIT 1`,
    [slug]
  );
  if (!rows[0]) throw new ApiError(404, 'Organization not found for this subdomain');

  const pricingTierId = Number(req.body.pricing_tier_id);
  if (!pricingTierId) throw new ApiError(400, 'A valid pricing_tier_id is required');

  const orderData = await platformPaymentService.createOrder({
    tenantId: rows[0].id,
    pricingTierId,
    currency: req.body.currency,
    notes: { payment_source: 'public_direct_checkout' },
  });

  res.json({ success: true, data: orderData });
}));

// Public: Verify payment without login
router.post('/public-verify-payment', handler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const payment = await platformPaymentService.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  res.json({ success: true, message: 'Payment verified and subscription activated successfully', data: payment });
}));

// ==========================================
// PROTECTED TENANT BILLING & CHECKOUT ROUTES
// ==========================================

const requireBillingAdmin: RequestHandler = (req, _res, next) => {
  const role = req.user?.role?.trim().toLowerCase();
  if (role === 'admin' || role === 'administrator' || role === 'super admin') {
    next();
    return;
  }
  next(new ApiError(403, 'Only organization administrators can manage billing'));
};

const getTenantId = (req: Request): number => {
  const tenantId = Number(req.user?.tenant_id ?? req.tenant?.id);
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new ApiError(400, 'No organization workspace is available for billing');
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
