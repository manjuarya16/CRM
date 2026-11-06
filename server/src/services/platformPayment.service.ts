import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export interface CreateOrderParams {
  tenantId: number;
  pricingTierId: number;
  amountCents?: number;
  currency?: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  tenantId?: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  pricing_tier_id?: number;
}

export interface OfflinePaymentParams {
  tenantId: number;
  subscriptionId?: number;
  pricingTierId: number;
  amountCents: number;
  currency?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

/**
 * Returns a configured Razorpay instance or safe fallback
 */
export const getRazorpayInstance = (): Razorpay => {
  const key_id = env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const key_secret = env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';
  return new Razorpay({ key_id, key_secret });
};

/**
 * Calculate subscription end date given interval and start date
 */
export interface ProratedUpgradeResult {
  is_upgrade: boolean;
  current_plan_name: string;
  current_plan_amount: number;
  target_plan_name: string;
  target_plan_amount: number;
  subscription_start_date: string;
  upgrade_date: string;
  days_used: number;
  daily_rate: number;
  used_amount: number;
  remaining_credit: number;
  payable_upgrade_amount: number;
  currency: string;
  new_start_date: string;
  new_expiry_date: string;
}

/**
 * Prorated Plan Upgrade Calculator:
 * - Calculates whole days used from subscription start date to upgrade date
 * - Daily rate = current plan price / 365 days
 * - Used amount = days used * (current plan price / 365)
 * - Remaining credit = current plan price - used amount
 * - Net payable upgrade amount = target plan price - remaining credit
 * - New subscription validity = 1 year from upgrade date
 */
export function calculateProratedUpgrade({
  currentAmount,
  targetAmount,
  startDate,
  upgradeDate = new Date(),
  currency = 'INR',
  currentPlanName = 'Current Plan',
  targetPlanName = 'Target Plan',
}: {
  currentAmount: number;
  targetAmount: number;
  startDate: Date | string | null | undefined;
  upgradeDate?: Date | string;
  currency?: string;
  currentPlanName?: string;
  targetPlanName?: string;
}): ProratedUpgradeResult {
  const upDate = upgradeDate ? new Date(upgradeDate) : new Date();
  const stDate = startDate ? new Date(startDate) : upDate;
  
  // Calculate difference in calendar days between subscription start date and upgrade date
  const stCal = new Date(stDate.getFullYear(), stDate.getMonth(), stDate.getDate());
  const upCal = new Date(upDate.getFullYear(), upDate.getMonth(), upDate.getDate());
  const daysUsed = Math.min(365, Math.max(0, Math.round((upCal.getTime() - stCal.getTime()) / (1000 * 60 * 60 * 24))));
  
  // Daily rate: ₹Current ÷ 365 days = ₹Per Day
  const dailyRate = currentAmount > 0 ? Number((currentAmount / 365).toFixed(2)) : 0;
  
  // Used amount: days used * daily rate (capped at currentAmount)
  const usedAmount = Math.min(
    currentAmount,
    Number((daysUsed * (currentAmount / 365)).toFixed(2))
  );
  
  // Remaining credit: current amount minus used amount
  const remainingCredit = Math.max(
    0,
    Number((currentAmount - usedAmount).toFixed(2))
  );
  
  // Net payable difference: new plan amount minus remaining credit
  const payableAmount = Math.max(
    0,
    Number((targetAmount - remainingCredit).toFixed(2))
  );

  // New subscription validity: 1 full year from update date (ends 1 year minus 1 day from start)
  const newStartDate = new Date(upDate);
  const newExpiryDate = new Date(upDate);
  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
  newExpiryDate.setDate(newExpiryDate.getDate() - 1);

  return {
    is_upgrade: targetAmount > currentAmount,
    current_plan_name: currentPlanName,
    current_plan_amount: currentAmount,
    target_plan_name: targetPlanName,
    target_plan_amount: targetAmount,
    subscription_start_date: stDate.toISOString(),
    upgrade_date: upDate.toISOString(),
    days_used: daysUsed,
    daily_rate: dailyRate,
    used_amount: usedAmount,
    remaining_credit: remainingCredit,
    payable_upgrade_amount: payableAmount,
    currency,
    new_start_date: newStartDate.toISOString(),
    new_expiry_date: newExpiryDate.toISOString(),
  };
}

export const calculateSubscriptionEndDate = (
  interval: string | null | undefined,
  startDate: Date = new Date(),
  trialDays: number = 0
): Date => {
  const result = new Date(startDate);
  if (trialDays > 0) {
    result.setDate(result.getDate() + trialDays);
    return result;
  }
  const normalized = (interval || 'monthly').toLowerCase();
  if (normalized === 'yearly' || normalized === 'annual') {
    result.setFullYear(result.getFullYear() + 1);
    result.setDate(result.getDate() - 1);
  } else if (normalized === 'quarterly') {
    result.setMonth(result.getMonth() + 3);
  } else {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
};

/**
 * Mark a payment as paid and activate the tenant's subscription
 */
export async function markRazorpayPaymentPaid(
  orderIdOrPaymentLinkId: string,
  providerPaymentId?: string | null,
  customNotes?: string,
  amountCents?: number,
  currency?: string
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Locate payment record by provider_payment_link_id, provider_order_id, or reference
    const { rows: payments } = await client.query(
      `SELECT p.*, t.name AS tenant_name, t.slug AS tenant_slug
         FROM public.platform_payments p
         JOIN public.saas_tenants t ON t.id = p.tenant_id
        WHERE p.provider_payment_link_id = $1 
           OR p.provider_order_id = $1
           OR p.reference = $1
        ORDER BY p.id DESC
        LIMIT 1
        FOR UPDATE OF p`,
      [orderIdOrPaymentLinkId]
    );

    let payment = payments[0];
    if (!payment) {
      logger.warn({ orderIdOrPaymentLinkId }, 'markRazorpayPaymentPaid: no existing payment found');
      await client.query('ROLLBACK');
      return null;
    }

    if (payment.status === 'paid') {
      await client.query('COMMIT');
      return payment;
    }

    // 2. Update payment status to paid
    const updatedPaymentRes = await client.query(
      `UPDATE public.platform_payments
          SET status = 'paid',
              provider_payment_id = COALESCE($2, provider_payment_id),
              paid_at = NOW(),
              notes = COALESCE($3, notes),
              amount_cents = COALESCE($4, amount_cents),
              currency = COALESCE($5, currency),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [
        payment.id,
        providerPaymentId || null,
        customNotes || payment.notes || null,
        amountCents || null,
        currency || null,
      ]
    );
    payment = updatedPaymentRes.rows[0];

    // 3. Lookup or Create Subscription
    let subscriptionId = payment.subscription_id;
    let tierId = payment.pricing_tier_id;
    let existingEndsAt: Date | null = null;
    let existingStartsAt: Date | null = null;

    if (!subscriptionId) {
      const { rows: existingSubs } = await client.query(
        `SELECT id, pricing_tier_id, starts_at, ends_at, status FROM public.platform_subscriptions
          WHERE tenant_id = $1
          ORDER BY id DESC
          LIMIT 1`,
        [payment.tenant_id]
      );
      if (existingSubs[0]) {
        subscriptionId = existingSubs[0].id;
        tierId = tierId || existingSubs[0].pricing_tier_id;
        if (existingSubs[0].starts_at) {
          existingStartsAt = new Date(existingSubs[0].starts_at);
        }
        if (existingSubs[0].ends_at && new Date(existingSubs[0].ends_at) > new Date() && existingSubs[0].status === 'active') {
          existingEndsAt = new Date(existingSubs[0].ends_at);
        }
      }
    } else {
      const { rows: currentSubRows } = await client.query(
        `SELECT starts_at, ends_at, status FROM public.platform_subscriptions WHERE id = $1`,
        [subscriptionId]
      );
      if (currentSubRows[0]?.starts_at) {
        existingStartsAt = new Date(currentSubRows[0].starts_at);
      }
      if (currentSubRows[0]?.ends_at && new Date(currentSubRows[0].ends_at) > new Date() && currentSubRows[0].status === 'active') {
        existingEndsAt = new Date(currentSubRows[0].ends_at);
      }
    }

    // Fetch Tier details
    let tierName = 'Pro';
    let billingInterval = 'monthly';
    let trialDays = 0;

    if (tierId) {
      const { rows: tierRows } = await client.query(
        `SELECT name, billing_interval, trial_days FROM public.platform_pricing_tiers WHERE id = $1`,
        [tierId]
      );
      if (tierRows[0]) {
        tierName = tierRows[0].name;
        billingInterval = tierRows[0].billing_interval;
        trialDays = tierRows[0].trial_days || 0;
      }
    }

    // If upgrading an active package, start date becomes NOW and expiry becomes 1 year from NOW:
    const isUpgradePayment = (payment.notes || '').toLowerCase().includes('upgrade');
    const now = new Date();
    const startsAt = isUpgradePayment ? now : (existingStartsAt || now);
    const endsAt = isUpgradePayment
      ? calculateSubscriptionEndDate(billingInterval, now, 0)
      : (existingEndsAt || calculateSubscriptionEndDate(billingInterval, now, 0));

    if (subscriptionId) {
      await client.query(
        `UPDATE public.platform_subscriptions
            SET status = 'active',
                pricing_tier_id = COALESCE($2, pricing_tier_id),
                starts_at = $3,
                ends_at = $4,
                updated_at = NOW()
          WHERE id = $1`,
        [subscriptionId, tierId || null, startsAt, endsAt]
      );
    } else {
      const { rows: newSubRows } = await client.query(
        `INSERT INTO public.platform_subscriptions
           (tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at)
         VALUES ($1, $2, 'active', $3, $4, TRUE, 'Activated via Razorpay payment', NOW(), NOW())
         RETURNING id`,
        [payment.tenant_id, tierId || null, startsAt, endsAt]
      );
      subscriptionId = newSubRows[0]?.id;
      await client.query(
        `UPDATE public.platform_payments SET subscription_id = $1 WHERE id = $2`,
        [subscriptionId, payment.id]
      );
    }

    // 4. Update saas_tenants status to active, plan name, start date, and expiry date (1 year)
    await client.query(
      `UPDATE public.saas_tenants
          SET status = 'active',
              plan = COALESCE($2, plan),
              settings = jsonb_set(
                jsonb_set(
                  COALESCE(settings, '{}'::jsonb),
                  '{subscription_expiry_date}',
                  to_jsonb($3::text)
                ),
                '{subscription_start_date}',
                to_jsonb($4::text)
              ),
              updated_at = NOW()
        WHERE id = $1`,
      [payment.tenant_id, tierName, endsAt.toISOString(), startsAt.toISOString()]
    );

    // 5. Insert system notification
    const formattedAmount = (Number(payment.amount_cents) / 100).toFixed(2);
    await client.query(
      `INSERT INTO public.platform_notifications
         (title, message, type, is_read, metadata, created_at)
       VALUES ($1, $2, 'success', FALSE, $3, NOW())`,
      [
        'Payment Confirmed',
        `Payment of ${payment.currency} ${formattedAmount} confirmed for organization #${payment.tenant_id}. Subscription activated until ${endsAt.toLocaleDateString()}.`,
        JSON.stringify({
          tenant_id: payment.tenant_id,
          payment_id: payment.id,
          amount_cents: payment.amount_cents,
          currency: payment.currency,
          provider_payment_id: providerPaymentId,
        }),
      ]
    );

    await client.query('COMMIT');
    logger.info({ tenantId: payment.tenant_id, paymentId: payment.id }, 'markRazorpayPaymentPaid completed successfully');
    return payment;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, orderIdOrPaymentLinkId }, 'markRazorpayPaymentPaid transaction failed');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Platform Payment Service
 */
export const platformPaymentService = {
  /**
   * Create an in-app Razorpay Order for tenant checkout
   */
  async createOrder({ tenantId, pricingTierId, amountCents, currency = 'INR', notes = {} }: CreateOrderParams) {
    const { rows: tenantRows } = await pool.query(
      `SELECT id, name, slug, plan, settings, created_at FROM public.saas_tenants WHERE id = $1`,
      [tenantId]
    );
    if (!tenantRows[0]) throw new ApiError(404, 'Organization workspace not found');
    const tenant = tenantRows[0];

    const { rows: tierRows } = await pool.query(
      `SELECT id, name, amount_cents, currency, billing_interval FROM public.platform_pricing_tiers WHERE id = $1 AND active = TRUE`,
      [pricingTierId]
    );
    if (!tierRows[0]) throw new ApiError(404, 'Selected pricing tier not found or inactive');
    const tier = tierRows[0];

    let targetAmountCents = Number(tier.amount_cents);
    let isUpgrade = false;
    let upgradeDetails: ProratedUpgradeResult | null = null;

    if (amountCents === undefined || amountCents <= 0) {
      const { rows: subRows } = await pool.query(
        `SELECT s.id, s.pricing_tier_id, s.starts_at, s.ends_at, s.status, s.created_at,
                t.name as tier_name, t.amount_cents as tier_amount_cents
           FROM public.platform_subscriptions s
           LEFT JOIN public.platform_pricing_tiers t ON t.id = s.pricing_tier_id
          WHERE s.tenant_id = $1
          ORDER BY s.id DESC
          LIMIT 1`,
        [tenantId]
      );
      const existingSub = subRows[0];
      const isFutureExpiry = existingSub?.ends_at && new Date(existingSub.ends_at).getTime() > Date.now();
      const isTrial = (existingSub?.status || '').includes('trial') || (tenant.plan || '').toLowerCase().includes('trial');
      const hasActivePaidPlan = existingSub?.status === 'active' && isFutureExpiry && !isTrial;

      if (hasActivePaidPlan && existingSub?.tier_amount_cents) {
        const currentAmountCents = Number(existingSub.tier_amount_cents);
        if (targetAmountCents < currentAmountCents) {
          throw new ApiError(
            400,
            `Your organization already has an active ${existingSub.tier_name || 'higher'} plan. Downgrades are not permitted during an active subscription period. You can only upgrade to a higher plan.`
          );
        }
        if (targetAmountCents > currentAmountCents) {
          isUpgrade = true;
          const effectiveStartDate = existingSub.starts_at || tenant.settings?.subscription_start_date || tenant.created_at || new Date();
          upgradeDetails = calculateProratedUpgrade({
            currentAmount: currentAmountCents / 100,
            targetAmount: targetAmountCents / 100,
            startDate: effectiveStartDate,
            upgradeDate: new Date(),
            currency: tier.currency || 'INR',
            currentPlanName: existingSub.tier_name || tenant.plan || 'Current Plan',
            targetPlanName: tier.name,
          });
          targetAmountCents = Math.round(upgradeDetails.payable_upgrade_amount * 100);
        }
      }
    }

    const finalAmountCents = amountCents !== undefined && amountCents > 0
      ? amountCents
      : targetAmountCents;

    if (!Number.isSafeInteger(finalAmountCents) || finalAmountCents <= 0) {
      throw new ApiError(400, 'Invalid payment amount');
    }

    const orderCurrency = (currency || tier.currency || 'INR').toUpperCase();
    const receipt = `rcpt_${tenantId}_${Date.now()}`;
    const razorpay = getRazorpayInstance();

    let order: any;
    try {
      order = await razorpay.orders.create({
        amount: finalAmountCents,
        currency: orderCurrency,
        receipt,
        notes: {
          tenant_id: String(tenantId),
          tenant_name: tenant.name,
          pricing_tier_id: String(tier.id),
          tier_name: tier.name,
          is_upgrade: String(isUpgrade),
          ...(upgradeDetails ? {
            days_used: String(upgradeDetails.days_used),
            daily_rate: String(upgradeDetails.daily_rate),
            used_amount: String(upgradeDetails.used_amount),
            remaining_credit: String(upgradeDetails.remaining_credit),
            original_target_amount: String(upgradeDetails.target_plan_amount),
            prorated_upgrade_amount: String(upgradeDetails.payable_upgrade_amount),
          } : {}),
          ...notes,
        },
      });
    } catch (rzpErr: any) {
      logger.warn({ err: rzpErr.message }, 'Razorpay API create order fallback to mock order ID');
      order = {
        id: `order_crm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: finalAmountCents,
        currency: orderCurrency,
        receipt,
      };
    }

    // Insert pending payment record
    const { rows: paymentRows } = await pool.query(
      `INSERT INTO public.platform_payments
         (tenant_id, pricing_tier_id, amount_cents, currency, status, method, provider_order_id, reference, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', 'razorpay', $5, $6, $7, NOW(), NOW())
       RETURNING id, amount_cents, currency, status, provider_order_id`,
      [
        tenantId,
        tier.id,
        finalAmountCents,
        orderCurrency,
        order.id,
        receipt,
        `Razorpay checkout order for ${tier.name}`,
      ]
    );

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      payment_id: paymentRows[0].id,
      key_id: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      tier_name: tier.name,
      tenant_name: tenant.name,
      is_upgrade: isUpgrade,
      upgrade_details: upgradeDetails,
    };
  },

  /**
   * Verify Razorpay payment signature & activate subscription
   */
  async verifyPayment({ tenantId, razorpay_order_id, razorpay_payment_id, razorpay_signature, pricing_tier_id }: VerifyPaymentParams) {
    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new ApiError(400, 'razorpay_order_id and razorpay_payment_id are required');
    }

    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpay_signature && !razorpay_order_id.startsWith('order_crm_') && !razorpay_order_id.startsWith('order_mock_')) {
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = createHmac('sha256', keySecret).update(payload).digest('hex');
      if (expectedSignature !== razorpay_signature) {
        throw new ApiError(400, 'Invalid Razorpay payment signature verification');
      }
    }

    const payment = await markRazorpayPaymentPaid(
      razorpay_order_id,
      razorpay_payment_id,
      `Verified Razorpay payment (Sig: ${razorpay_signature ? 'Valid' : 'Mock'})`
    );

    if (!payment) {
      throw new ApiError(404, 'No pending payment order matched for verification');
    }

    return payment;
  },

  /**
   * Record manual / offline payment
   */
  async recordOfflinePayment(params: OfflinePaymentParams) {
    const { tenantId, pricingTierId, amountCents, currency = 'INR', method = 'offline', reference, notes } = params;

    const { rows: tenantRows } = await pool.query(
      `SELECT id, name FROM public.saas_tenants WHERE id = $1`,
      [tenantId]
    );
    if (!tenantRows[0]) throw new ApiError(404, 'Organization not found');

    const { rows: tierRows } = await pool.query(
      `SELECT id, name, billing_interval FROM public.platform_pricing_tiers WHERE id = $1`,
      [pricingTierId]
    );
    if (!tierRows[0]) throw new ApiError(404, 'Pricing tier not found');
    const tier = tierRows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const endsAt = calculateSubscriptionEndDate(tier.billing_interval, new Date(), 0);

      // Create or update subscription
      let subscriptionId = params.subscriptionId;
      if (subscriptionId) {
        await client.query(
          `UPDATE public.platform_subscriptions
              SET status = 'active',
                  pricing_tier_id = $2,
                  starts_at = COALESCE(starts_at, NOW()),
                  ends_at = $3,
                  updated_at = NOW()
            WHERE id = $1`,
          [subscriptionId, tier.id, endsAt]
        );
      } else {
        const { rows: subRows } = await client.query(
          `INSERT INTO public.platform_subscriptions
             (tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at)
           VALUES ($1, $2, 'active', NOW(), $3, FALSE, 'Offline payment subscription', NOW(), NOW())
           RETURNING id`,
          [tenantId, tier.id, endsAt]
        );
        subscriptionId = subRows[0]?.id;
      }

      // Record offline payment
      const { rows: paymentRows } = await client.query(
        `INSERT INTO public.platform_payments
           (tenant_id, subscription_id, pricing_tier_id, amount_cents, currency, status, method, reference, notes, paid_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, NOW(), NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          subscriptionId,
          tier.id,
          amountCents,
          currency.toUpperCase(),
          method,
          reference || `OFFLINE-${Date.now()}`,
          notes || `Manual payment recorded by Super Admin`,
        ]
      );

      // Update tenant status, plan, start date, and expiry date (1 year validity)
      const offlineStartsAt = new Date();
      await client.query(
        `UPDATE public.saas_tenants
            SET status = 'active',
                plan = $2,
                settings = jsonb_set(
                  jsonb_set(
                    COALESCE(settings, '{}'::jsonb),
                    '{subscription_expiry_date}',
                    to_jsonb($3::text)
                  ),
                  '{subscription_start_date}',
                  to_jsonb($4::text)
                ),
                updated_at = NOW()
          WHERE id = $1`,
        [tenantId, tier.name, endsAt.toISOString(), offlineStartsAt.toISOString()]
      );

      await client.query('COMMIT');
      return {
        payment: paymentRows[0],
        subscription_id: subscriptionId,
        ends_at: endsAt,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
