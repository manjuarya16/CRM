import { Request, RequestHandler, Response, Router } from 'express';
import { pool } from '@/config/db';
import { ApiError } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';

const router = Router();

const handler = (callback: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    callback(req, res).catch(next);
  };

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
    },
  });
}));

export default router;
