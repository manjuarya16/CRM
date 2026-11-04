import { Request, RequestHandler, Response, Router } from 'express';
import { createHmac } from 'crypto';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { ApiError } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { platformPaymentService, getRazorpayInstance } from '@/services/platformPayment.service';

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
    const reservedSlugs = ['admin', 'api', 'www', 'localhost', '127', 'dev', 'staging', 'superadmin', 'super-admin', 'portal', 'crm', 'app'];
    if (sub && !reservedSlugs.includes(sub.toLowerCase())) {
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

  // Dynamically resolve tier from database matching plan name
  const { rows: tierRows } = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM public.platform_pricing_tiers 
      WHERE active=TRUE 
        AND (LOWER(name) = LOWER($1) OR LOWER(name) LIKE $2)
      ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END, id ASC 
      LIMIT 1`,
    [planName, `%${planName.toLowerCase()}%`]
  );
  let tierId: number | null = tierRows[0]?.id ? Number(tierRows[0].id) : null;

  // Check if organization already has an active package and is upgrading
  const { rows: subRows } = await pool.query(
    `SELECT s.id, s.pricing_tier_id, s.status, s.ends_at, t.name as tier_name
       FROM public.platform_subscriptions s
       LEFT JOIN public.platform_pricing_tiers t ON t.id = s.pricing_tier_id
      WHERE s.tenant_id = $1
      ORDER BY s.id DESC
      LIMIT 1`,
    [org.id]
  );

  const existingSub = subRows[0];
  const expiryDateStr = existingSub?.ends_at || org.settings?.subscription_expiry_date;
  const existingExpiry = expiryDateStr ? new Date(expiryDateStr) : null;
  const isFutureExpiry = existingExpiry && existingExpiry.getTime() > Date.now();
  const currentPlanStr = (existingSub?.tier_name || org.plan || '').toLowerCase();
  const isCurrentTrial = currentPlanStr.includes('trial') || org.status === 'trial';
  const hasActivePaidPlan = (org.status === 'active' || existingSub?.status === 'active') && isFutureExpiry && !isCurrentTrial;

  let isUpgrade = false;
  let finalPayAmount = targetAmount;
  let currentPlanPrice = 0;
  let currentPlanName = org.plan || existingSub?.tier_name || '';

  if (hasActivePaidPlan) {
    if (currentPlanStr.includes('business')) {
      currentPlanPrice = isUsd ? 449 : 29999;
      currentPlanName = 'Business';
    } else if (currentPlanStr.includes('growth') || currentPlanStr.includes('professional')) {
      currentPlanPrice = isUsd ? 299 : 19999;
      currentPlanName = 'Growth';
    } else if (currentPlanStr.includes('starter')) {
      currentPlanPrice = isUsd ? 149 : 9999;
      currentPlanName = 'Starter';
    }

    const isCurrentPlan = currentPlanStr.includes(plan_code.toLowerCase()) || (org.plan || '').toLowerCase() === plan_code.toLowerCase();

    // Disallow downgrades during an active paid subscription
    if (!isCurrentPlan && targetAmount < currentPlanPrice) {
      throw new ApiError(
        400,
        `Your organization already has an active ${currentPlanName} plan. Downgrades are not permitted during an active subscription period. You can only upgrade to a higher plan.`
      );
    }

    if (targetAmount > currentPlanPrice) {
      isUpgrade = true;
      finalPayAmount = targetAmount - currentPlanPrice;
    }
  }

  const amountInSubunits = Math.round(finalPayAmount * 100);
  const orderCurrency = isUsd ? 'USD' : 'INR';
  const receipt = `rcpt_pub_${org.id}_${Date.now()}`;
  const razorpay = getRazorpayInstance();

  let order: any;
  try {
    order = await razorpay.orders.create({
      amount: amountInSubunits,
      currency: orderCurrency,
      receipt,
      notes: {
        organization_id: String(org.id),
        organization_slug: org.slug,
        organization_name: org.name,
        plan_code,
        plan_name: planName,
        pricing_tier_id: String(tierId),
        is_upgrade: String(isUpgrade),
        current_plan_name: currentPlanName,
        current_plan_price: String(currentPlanPrice),
        upgrade_amount: String(finalPayAmount),
        original_amount: String(targetAmount),
        payment_source: 'direct_public_payment_link',
      },
    });
  } catch (rzpErr: any) {
    logger.warn({ err: rzpErr.message }, 'Razorpay API public create order fallback');
    order = {
      id: `order_mock_${Date.now()}`,
      amount: amountInSubunits,
      currency: orderCurrency,
      receipt,
    };
  }

  // Insert pending payment record in platform_payments so verification and webhooks can track it
  try {
    await pool.query(
      `INSERT INTO public.platform_payments
         (tenant_id, pricing_tier_id, amount_cents, currency, status, method, provider_order_id, reference, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', 'razorpay', $5, $6, $7, NOW(), NOW())`,
      [
        org.id,
        tierId,
        amountInSubunits,
        orderCurrency,
        order.id,
        receipt,
        isUpgrade
          ? `Razorpay upgrade checkout for ${planName} Plan (Extra amount: ${orderCurrency} ${finalPayAmount})`
          : `Razorpay checkout order for ${planName} Plan`,
      ]
    );
  } catch (dbErr: any) {
    logger.warn({ err: dbErr.message }, 'Could not record pending platform_payments row');
  }

  res.json({
    success: true,
    data: {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan_name: planName,
      plan_code,
      is_upgrade: isUpgrade,
      upgrade_amount: finalPayAmount,
      total_valuation: targetAmount,
      current_plan_price: currentPlanPrice,
      original_amount: targetAmount,
      current_plan_name: currentPlanName,
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
  const { plan_code = 'starter', currency = 'INR', custom_amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify HMAC signature if present and not mock
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (keySecret && razorpay_signature && !razorpay_order_id?.startsWith('order_mock_')) {
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = createHmac('sha256', keySecret).update(payload).digest('hex');
    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, 'Invalid Razorpay payment signature verification');
    }
  }

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

  // Dynamically resolve tier from database matching plan name
  const { rows: tierRows } = await pool.query<{ id: number; name: string }>(
    `SELECT id, name FROM public.platform_pricing_tiers 
      WHERE active=TRUE 
        AND (LOWER(name) = LOWER($1) OR LOWER(name) LIKE $2)
      ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END, id ASC 
      LIMIT 1`,
    [planName, `%${planName.toLowerCase()}%`]
  );
  let tierId: number | null = tierRows[0]?.id ? Number(tierRows[0].id) : null;

  // Check if organization has an existing active subscription and whether this is an upgrade
  const { rows: subRows } = await pool.query(
    `SELECT s.id, s.pricing_tier_id, s.status, s.ends_at, t.name as tier_name
       FROM public.platform_subscriptions s
       LEFT JOIN public.platform_pricing_tiers t ON t.id = s.pricing_tier_id
      WHERE s.tenant_id = $1
      ORDER BY s.id DESC
      LIMIT 1`,
    [tenant.id]
  );

  const existingSub = subRows[0];
  const expiryDateStr = existingSub?.ends_at || tenant.settings?.subscription_expiry_date;
  const existingExpiry = expiryDateStr ? new Date(expiryDateStr) : null;
  const isFutureExpiry = existingExpiry && existingExpiry.getTime() > Date.now();
  const currentPlanStr = (existingSub?.tier_name || tenant.plan || '').toLowerCase();
  const isCurrentTrial = currentPlanStr.includes('trial') || tenant.status === 'trial';
  const hasActivePaidPlan = (tenant.status === 'active' || existingSub?.status === 'active') && isFutureExpiry && !isCurrentTrial;

  let isUpgrade = false;
  let finalPayAmount = targetAmount;
  let currentPlanPrice = 0;
  let currentPlanName = tenant.plan || existingSub?.tier_name || 'Current';

  if (hasActivePaidPlan) {
    if (currentPlanStr.includes('business')) {
      currentPlanPrice = isUsd ? 449 : 29999;
      currentPlanName = 'Business';
    } else if (currentPlanStr.includes('growth') || currentPlanStr.includes('professional')) {
      currentPlanPrice = isUsd ? 299 : 19999;
      currentPlanName = 'Growth';
    } else if (currentPlanStr.includes('starter')) {
      currentPlanPrice = isUsd ? 149 : 9999;
      currentPlanName = 'Starter';
    }

    const isCurrentPlan = currentPlanStr.includes(plan_code.toLowerCase()) || (tenant.plan || '').toLowerCase() === plan_code.toLowerCase();

    // Disallow downgrades during an active paid subscription
    if (!isCurrentPlan && targetAmount < currentPlanPrice) {
      throw new ApiError(
        400,
        `Your organization already has an active ${currentPlanName} plan. Downgrades are not permitted during an active subscription period. You can only upgrade to a higher plan.`
      );
    }

    if (targetAmount > currentPlanPrice) {
      isUpgrade = true;
      finalPayAmount = targetAmount - currentPlanPrice;
    }
  }

  // If upgrading an active package, keep the existing expiry date intact!
  // Otherwise, set 1 year from now.
  let targetExpiry: Date;
  if (isUpgrade && existingExpiry) {
    targetExpiry = existingExpiry;
  } else {
    const now = new Date();
    targetExpiry = new Date(now);
    targetExpiry.setFullYear(targetExpiry.getFullYear() + 1);
  }

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
    [planName, targetExpiry.toISOString(), tenant.id]
  );

  // 2. Insert/Update platform_subscriptions
  let subId: string | number;
  if (isUpgrade && existingSub?.id) {
    await pool.query(
      `UPDATE public.platform_subscriptions
          SET pricing_tier_id = $1,
              status = 'active',
              notes = $2,
              updated_at = NOW()
        WHERE id = $3`,
      [tierId, `Upgraded to ${planName} Plan (Extra amount: ${isUsd ? 'USD' : 'INR'} ${finalPayAmount})`, existingSub.id]
    );
    subId = existingSub.id;
  } else {
    const subRes = await pool.query(
      `INSERT INTO public.platform_subscriptions (
          tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at
       ) VALUES ($1, $2, 'active', NOW(), $3, TRUE, $4, NOW(), NOW())
       RETURNING id`,
      [tenant.id, tierId, targetExpiry.toISOString(), `Direct public payment for ${planName} Plan`]
    );
    subId = subRes.rows[0]?.id;
  }

  // 3. Update existing pending payment or insert platform_payments
  const generatedInvoice = `INV-${new Date().getFullYear()}-${String(tenant.id).padStart(2, '0')}${Math.floor(100 + Math.random() * 900)}`;

  const existingPaymentRes = await pool.query(
    `SELECT id FROM public.platform_payments WHERE provider_order_id = $1 LIMIT 1`,
    [razorpay_order_id]
  );

  if (existingPaymentRes.rows.length > 0) {
    await pool.query(
      `UPDATE public.platform_payments
          SET status = 'paid',
              provider_payment_id = $1,
              subscription_id = $2,
              amount_cents = $3,
              reference = COALESCE(reference, $4),
              notes = $5,
              paid_at = NOW(),
              updated_at = NOW()
        WHERE id = $6`,
      [
        razorpay_payment_id || `pay_${Date.now()}`,
        subId,
        Math.round(finalPayAmount * 100),
        generatedInvoice,
        isUpgrade ? `Upgraded to ${planName} Plan` : `Paid ${planName} Plan`,
        existingPaymentRes.rows[0].id
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO public.platform_payments (
          tenant_id, subscription_id, pricing_tier_id, amount_cents, currency, status, method,
          provider_order_id, provider_payment_id, reference, notes, paid_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'paid', 'Razorpay', $6, $7, $8, $9, NOW(), NOW(), NOW())`,
      [
        tenant.id,
        subId,
        tierId,
        Math.round(finalPayAmount * 100),
        currency.toUpperCase(),
        razorpay_order_id || `order_${Date.now()}`,
        razorpay_payment_id || `pay_${Date.now()}`,
        generatedInvoice,
        isUpgrade ? `Upgraded to ${planName} Plan` : `Direct public subscription checkout for ${tenant.name}`
      ]
    );
  }

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
        finalPayAmount,
        currency.toUpperCase(),
        generatedInvoice,
        JSON.stringify({
          entity: 'event',
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: razorpay_payment_id || `pay_${Date.now()}`,
                amount: Math.round(finalPayAmount * 100),
                currency: currency.toUpperCase(),
                status: 'captured',
                notes: { organization_id: tenant.id, organization_slug: tenant.slug, plan_code, is_upgrade: isUpgrade }
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
    message: isUpgrade
      ? `Plan upgraded to ${planName} successfully! Your subscription expiry date remains ${targetExpiry.toLocaleDateString()}.`
      : 'Payment verified and subscription activated successfully',
    data: {
      subscription_expiry_date: targetExpiry.toISOString(),
      plan_name: planName,
      organization: tenant.name,
      invoice_number: generatedInvoice,
      is_upgrade: isUpgrade,
      paid_amount: finalPayAmount,
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
