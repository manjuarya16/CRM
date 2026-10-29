import { createCipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import { Request, RequestHandler, Response, Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { pool } from '@/config/db';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { requirePlatformModulePermission, requireSuperAdmin } from '@/middleware/superAdminAuth';
import { sendRealMail, testSmtpConnection } from '@/utils/mailer';
import { getAllPlatformRoleIds, getPlatformRoleDescendantIds } from '@/services/platformRoleAccess.service';
import { superAdminService } from '@/services/superAdmin.service';

const router = Router();
const idSchema = z.coerce.number().int().positive().safe();
const tenantIdFrom = (value: string | string[]): number => {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'A valid positive tenant or record ID is required');
  return parsed.data;
};
const pageParams = (req: Request) => {
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
  return { limit, offset: (page - 1) * limit };
};
const handler = (callback: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    callback(req, res).catch(next);
  };
const currentPlatformRoleId = (req: Request): number | string | null =>
  (req as Request & { superAdmin?: { platform_role_id?: number | string | null } }).superAdmin?.platform_role_id ?? null;
const isPlatformOwner = (req: Request): boolean =>
  Boolean((req as Request & { superAdmin?: { is_platform_owner?: boolean } }).superAdmin?.is_platform_owner);
const visiblePlatformRoleIds = async (req: Request): Promise<string[]> =>
  isPlatformOwner(req)
    ? getAllPlatformRoleIds()
    : getPlatformRoleDescendantIds(currentPlatformRoleId(req));
const assertRoleWithinCurrentHierarchy = async (
  req: Request,
  roleId: number | string,
  allowCurrentRole = true
): Promise<void> => {
  const currentRoleId = currentPlatformRoleId(req);
  const descendants = await visiblePlatformRoleIds(req);
  if (!descendants.includes(String(roleId)) || (!allowCurrentRole && String(currentRoleId) === String(roleId))) {
    throw new ApiError(403, 'The target role is outside your platform role hierarchy');
  }
};
const tenantExists = async (tenantId: number): Promise<void> => {
  const { rowCount } = await pool.query('SELECT id FROM public.saas_tenants WHERE id = $1', [tenantId]);
  if (!rowCount) throw new ApiError(404, 'Organization not found');
};
const sameLengthEqual = (left: string, right: string): boolean => {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && leftBuffer.length > 0 && timingSafeEqual(leftBuffer, rightBuffer);
};
const encryptionKey = (): Buffer => {
  if (!env.PLATFORM_SETTINGS_ENCRYPTION_KEY) {
    throw new ApiError(503, 'PLATFORM_SETTINGS_ENCRYPTION_KEY is required to write SMTP secrets');
  }
  return createHash('sha256').update(env.PLATFORM_SETTINGS_ENCRYPTION_KEY, 'utf8').digest();
};
const encryptSecret = (secret: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
};
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character));
const tenantLoginUrl = (slug: string): string => {
  const origin = new URL(env.CLIENT_ORIGIN);
  const hostname = origin.hostname;
  const rootDomain = hostname === 'localhost' || hostname === '127.0.0.1'
    ? hostname
    : hostname.split('.').slice(1).join('.') || hostname;
  return `${origin.protocol}//${slug}.${rootDomain}${origin.port ? `:${origin.port}` : ''}/auth/login`;
};
const sendTemplateMail = async (
  templateName: string,
  recipient: string,
  variables: Record<string, string>,
  fallback: { subject: string; html: string }
): Promise<boolean> => {
  const { rows } = await pool.query<{ subject: string; content: string }>(
    'SELECT subject, content FROM public.platform_email_templates WHERE LOWER(name)=LOWER($1) LIMIT 1',
    [templateName]
  );
  const template = rows[0] || fallback;
  const replaceVariables = (content: string, escape: (value: string) => string) =>
    content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
      escape(variables[key] || '')
    );
  return sendRealMail({
    to: recipient,
    subject: replaceVariables(template.subject, (value) => value),
    html: replaceVariables(template.content, escapeHtml),
    text: replaceVariables(template.content.replace(/<[^>]*>/g, ''), (value) => value),
  });
};
const activatePaidSubscription = async (client: PoolClient, tenantId: number, subscriptionId: number): Promise<void> => {
  const { rows } = await client.query(
    `UPDATE public.platform_subscriptions s
        SET status='active',
            starts_at=CASE WHEN s.ends_at IS NOT NULL AND s.ends_at <= NOW() THEN NOW() ELSE s.starts_at END,
            ends_at=CASE
              WHEN t.billing_interval='monthly' THEN GREATEST(COALESCE(s.ends_at, NOW()), NOW()) + INTERVAL '1 month'
              WHEN t.billing_interval='yearly' THEN GREATEST(COALESCE(s.ends_at, NOW()), NOW()) + INTERVAL '1 year'
              WHEN t.billing_interval='one_time' THEN NULL
              ELSE s.ends_at
            END,
            updated_at=NOW()
       FROM public.platform_pricing_tiers t
      WHERE s.id=$1 AND s.tenant_id=$2 AND t.id=s.pricing_tier_id
      RETURNING t.name`,
    [subscriptionId, tenantId]
  );
  if (rows.length) {
    await client.query("UPDATE public.saas_tenants SET plan=$1, status='active', updated_at=NOW() WHERE id=$2", [rows[0].name, tenantId]);
    return;
  }
  await client.query(
    `UPDATE public.platform_subscriptions SET status='active', updated_at=NOW()
      WHERE id=$1 AND tenant_id=$2`,
    [subscriptionId, tenantId]
  );
};
const markRazorpayPaymentPaid = async (orderId: string, paymentId: string | null, tenantId?: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, tenant_id, subscription_id, status, provider_payment_id
         FROM public.platform_payments
        WHERE provider_order_id=$1 AND ($2::bigint IS NULL OR tenant_id=$2)
        FOR UPDATE`,
      [orderId, tenantId ?? null]
    );
    const payment = rows[0];
    if (!payment) {
      await client.query('COMMIT');
      return null;
    }
    if (payment.status === 'paid') {
      if (paymentId && payment.provider_payment_id && payment.provider_payment_id !== paymentId) {
        throw new ApiError(409, 'This order is already associated with a different Razorpay payment');
      }
      if (paymentId && !payment.provider_payment_id) {
        await client.query(
          'UPDATE public.platform_payments SET provider_payment_id=$1, updated_at=NOW() WHERE id=$2',
          [paymentId, payment.id]
        );
      }
      await client.query('COMMIT');
      return { ...payment, provider_payment_id: paymentId || payment.provider_payment_id };
    }
    if (!['created', 'pending', 'failed'].includes(payment.status)) {
      throw new ApiError(409, 'This Razorpay order is no longer payable');
    }
    await client.query(
      `UPDATE public.platform_payments
          SET status='paid', provider_payment_id=COALESCE($1, provider_payment_id),
              paid_at=COALESCE(paid_at, NOW()), updated_at=NOW()
        WHERE id=$2`,
      [paymentId, payment.id]
    );
    if (payment.subscription_id) {
      await activatePaidSubscription(client, Number(payment.tenant_id), Number(payment.subscription_id));
    }
    await client.query('COMMIT');
    return { ...payment, status: 'paid', provider_payment_id: paymentId || payment.provider_payment_id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
type ManualPaymentInput = {
  amount_cents: number;
  currency: string;
  subscription_id?: number | null;
  status: 'recorded' | 'paid' | 'pending' | 'failed' | 'refunded';
  reference?: string | null;
  notes?: string | null;
};
const createManualPayment = async (tenantId: number, input: ManualPaymentInput) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (input.subscription_id) {
      const subscription = await client.query(
        'SELECT id FROM public.platform_subscriptions WHERE id=$1 AND tenant_id=$2 FOR UPDATE',
        [input.subscription_id, tenantId]
      );
      if (!subscription.rowCount) throw new ApiError(400, 'Subscription does not belong to this organization');
    }
    const { rows } = await client.query(
      `INSERT INTO public.platform_payments
         (tenant_id, subscription_id, amount_cents, currency, status, method, reference, notes, paid_at)
       VALUES ($1,$2,$3,$4,$5,'manual',$6,$7,CASE WHEN $5='paid' THEN NOW() ELSE NULL END)
       RETURNING id, tenant_id, subscription_id, amount_cents, currency, status, method, reference, notes, paid_at, created_at`,
      [tenantId, input.subscription_id || null, input.amount_cents, input.currency, input.status,
        input.reference || null, input.notes || null]
    );
    if (input.status === 'paid' && input.subscription_id) {
      await activatePaidSubscription(client, tenantId, input.subscription_id);
    }
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
const publicSmtp = (row: any) => ({
  host: row.host,
  port: row.port,
  secure: row.secure,
  username: row.username,
  from_email: row.from_email,
  from_name: row.from_name,
  password_configured: Boolean(row.password_encrypted),
  updated_at: row.updated_at,
});
const amountSchema = z.number().int().safe().min(0).max(100_000_000_000);
const tierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  amount_cents: amountSchema,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
  billing_interval: z.enum(['monthly', 'yearly', 'one_time']).default('monthly'),
  trial_days: z.number().int().min(0).max(365).default(14),
  features: z.array(z.unknown()).max(100).default([]),
  limits: z.record(z.string(), z.unknown()).default({}),
  active: z.boolean().default(true),
});
const subscriptionSchema = z.object({
  pricing_tier_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'cancelled', 'expired']).default('trialing'),
  trial_days: z.number().int().min(1).max(365).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  auto_renew: z.boolean().default(false),
  notes: z.string().max(5000).nullable().optional(),
});
const platformRoleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  parent_role_id: idSchema.nullable().optional(),
  permission_type: z.enum(['all', 'custom']).default('custom'),
  permissions: z.union([
    z.array(z.string()).max(1000),
    z.record(z.string(), z.unknown()),
  ]).nullable().optional(),
});
const demoRequestSchema = z.object({
  name: z.string().trim().min(1).max(191),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  company: z.string().trim().max(191).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  message: z.string().trim().max(5000).nullable().optional(),
});

// These public endpoints never mutate tenant data. The webhook below only acts
// on an existing payment order after verifying its provider signature.
router.post('/demo-requests', handler(async (req, res) => {
  const input = demoRequestSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.platform_demo_requests (name, email, company, phone, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, company, status, created_at`,
    [input.name, input.email, input.company || null, input.phone || null, input.message || null]
  );
  const emailSent = await sendTemplateMail('demo_received', input.email, {
    name: input.name,
    company: input.company || '',
  }, {
    subject: 'We received your CRM demo request',
    html: `<p>Hi ${escapeHtml(input.name)},</p><p>We received your demo request${input.company ? ` for ${escapeHtml(input.company)}` : ''}. Our team will contact you soon.</p>`,
  });
  res.status(201).json({
    success: true,
    data: rows[0],
    email_sent: emailSent,
    message: emailSent ? 'Demo request submitted and confirmation email sent.' : 'Demo request submitted; confirmation email could not be sent. Please check SMTP configuration.',
  });
}));

router.post('/payments/razorpay/webhook', handler(async (req, res) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.header('x-razorpay-signature') || '';
  if (!secret) throw new ApiError(503, 'Razorpay webhook verification is not configured');
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody || typeof req.body !== 'object' || req.body === null) {
    throw new ApiError(400, 'A signed Razorpay webhook payload is required');
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!sameLengthEqual(signature, expected)) throw new ApiError(401, 'Invalid Razorpay webhook signature');

  const event = req.body.event;
  const entity = req.body.payload?.payment?.entity || req.body.payload?.order?.entity;
  const orderId = entity?.order_id || entity?.id;
  if (typeof event !== 'string' || typeof orderId !== 'string') {
    res.json({ success: true, ignored: true });
    return;
  }
  const eventStatus: Record<string, 'paid' | 'failed' | 'refunded'> = {
    'payment.captured': 'paid',
    'order.paid': 'paid',
    'payment.failed': 'failed',
    'payment.refunded': 'refunded',
  };
  const status = eventStatus[event];
  if (!status) {
    res.json({ success: true, ignored: true });
    return;
  }
  const providerPaymentId = typeof entity?.id === 'string' && entity.order_id ? entity.id : null;
  if (status === 'paid') {
    const payment = await markRazorpayPaymentPaid(orderId, providerPaymentId);
    res.json({ success: true, matched: Boolean(payment) });
    return;
  }
  const { rows } = await pool.query(
    `UPDATE public.platform_payments
       SET status = $1,
           provider_payment_id = CASE WHEN $1 = 'refunded' THEN COALESCE($2, provider_payment_id) ELSE provider_payment_id END,
           updated_at = NOW()
     WHERE provider_order_id = $3
       AND (status IN ('created', 'pending') OR (status = 'paid' AND $1 = 'refunded'))
     RETURNING id, tenant_id, subscription_id, status`,
    [status, providerPaymentId, orderId]
  );
  res.json({ success: true, matched: Boolean(rows[0]) });
}));

router.use(requireSuperAdmin, requirePlatformModulePermission);

router.get('/platform-users', handler(async (req, res) => {
  const roleIds = await visiblePlatformRoleIds(req);
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.platform_role_id, r.name AS role_name,
            u.status, u.created_at, u.updated_at
       FROM public.saas_super_admins u
       LEFT JOIN public.platform_roles r ON r.id = u.platform_role_id
      WHERE u.platform_role_id = ANY($1::bigint[])
          OR ($2::boolean AND u.platform_role_id IS NULL)
       ORDER BY u.id DESC`,
    [roleIds, isPlatformOwner(req)]
  );
  res.json({ success: true, data: rows });
}));
router.post('/platform-users', handler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    platform_role_id: idSchema,
    status: z.enum(['active', 'suspended']).default('active'),
  }).parse(req.body);
  await assertRoleWithinCurrentHierarchy(req, input.platform_role_id);
  const role = await pool.query('SELECT id FROM public.platform_roles WHERE id = $1', [input.platform_role_id]);
  if (!role.rowCount) throw new ApiError(400, 'Platform role was not found');
  const passwordHash = await bcrypt.hash(input.password, 10);
  const { rows } = await pool.query(
    `INSERT INTO public.saas_super_admins (name, email, password_hash, platform_role_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, platform_role_id, status, created_at, updated_at`,
    [input.name, input.email, passwordHash, input.platform_role_id, input.status]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.patch('/platform-users/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
    password: z.string().min(8).max(128).optional(),
    platform_role_id: idSchema.optional(),
    status: z.enum(['active', 'suspended']).optional(),
  }).parse(req.body);
  if (!Object.keys(input).length) throw new ApiError(400, 'At least one Super Admin user field is required');
  const existingUser = await pool.query<{ platform_role_id: number | string | null }>(
    'SELECT platform_role_id FROM public.saas_super_admins WHERE id = $1',
    [id]
  );
  if (!existingUser.rows[0]) throw new ApiError(404, 'Super Admin user not found');
  if (existingUser.rows[0].platform_role_id !== null) {
    await assertRoleWithinCurrentHierarchy(req, existingUser.rows[0].platform_role_id);
  } else if (!isPlatformOwner(req)) {
    throw new ApiError(403, 'The target user is outside your platform role hierarchy');
  }
  if (input.platform_role_id !== undefined) {
    await assertRoleWithinCurrentHierarchy(req, input.platform_role_id);
    const role = await pool.query('SELECT id FROM public.platform_roles WHERE id = $1', [input.platform_role_id]);
    if (!role.rowCount) throw new ApiError(400, 'Platform role was not found');
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['name', 'email', 'platform_role_id', 'status'] as const) {
    if (input[key] !== undefined) {
      values.push(input[key]);
      fields.push(`${key}=$${values.length}`);
    }
  }
  if (input.password !== undefined) {
    values.push(await bcrypt.hash(input.password, 10));
    fields.push(`password_hash=$${values.length}`);
  }
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE public.saas_super_admins
        SET ${fields.join(', ')}, updated_at=NOW()
      WHERE id=$${values.length}
      RETURNING id, name, email, platform_role_id, status, created_at, updated_at`,
    values
  );
  if (!rows.length) throw new ApiError(404, 'Super Admin user not found');
  res.json({ success: true, data: rows[0] });
}));
router.delete('/platform-users/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const target = await pool.query<{ platform_role_id: number | string | null }>(
    'SELECT platform_role_id FROM public.saas_super_admins WHERE id = $1',
    [id]
  );
  if (!target.rows[0]) throw new ApiError(404, 'Super Admin user not found');
  if (target.rows[0].platform_role_id === null && !isPlatformOwner(req)) {
    throw new ApiError(403, 'The target user is outside your platform role hierarchy');
  }
  if (target.rows[0].platform_role_id !== null) {
    await assertRoleWithinCurrentHierarchy(req, target.rows[0].platform_role_id);
  }
  const currentAdminId = (req as Request & { superAdmin?: { sub?: string } }).superAdmin?.sub;
  if (currentAdminId === String(id)) throw new ApiError(400, 'You cannot delete the Super Admin account you are currently using');
  const { rowCount } = await pool.query('DELETE FROM public.saas_super_admins WHERE id=$1', [id]);
  if (!rowCount) throw new ApiError(404, 'Super Admin user not found');
  res.json({ success: true, message: 'Super Admin user deleted successfully' });
}));

// Global roles belong to the platform, not to an organization.
router.get('/platform-roles', handler(async (req, res) => {
  const roleIds = await visiblePlatformRoleIds(req);
  const { rows } = await pool.query(
    `SELECT id, name, description, parent_role_id, permission_type, permissions, created_at, updated_at
       FROM public.platform_roles
      WHERE id = ANY($1::bigint[])
      ORDER BY name`,
    [roleIds]
  );
  res.json({ success: true, data: rows });
}));
router.post('/platform-roles', handler(async (req, res) => {
  const input = platformRoleSchema.parse(req.body);
  if (input.parent_role_id == null) throw new ApiError(400, 'A child platform role must have a parent role');
  await assertRoleWithinCurrentHierarchy(req, input.parent_role_id);
  const parent = await pool.query('SELECT id FROM public.platform_roles WHERE id=$1', [input.parent_role_id]);
  if (!parent.rowCount) throw new ApiError(400, 'Parent role was not found');
  validateRoleAccessSize(input.permissions);
  const { rows } = await pool.query(
    `INSERT INTO public.platform_roles (name, description, parent_role_id, permission_type, permissions)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING id, name, description, parent_role_id, permission_type, permissions, created_at, updated_at`,
    [input.name, input.description || null, input.parent_role_id ?? null, input.permission_type,
      input.permissions == null ? null : JSON.stringify(input.permissions)]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.patch('/platform-roles/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  await assertRoleWithinCurrentHierarchy(req, id, false);
  const input = platformRoleSchema.partial().parse(req.body);
  if (!Object.keys(input).length) throw new ApiError(400, 'At least one platform role field is required');
  if (Object.prototype.hasOwnProperty.call(input, 'parent_role_id') && input.parent_role_id == null) {
    throw new ApiError(400, 'A platform role must remain in the assigned role hierarchy');
  }
  if (input.parent_role_id != null) {
    await assertRoleWithinCurrentHierarchy(req, input.parent_role_id);
    const parent = await pool.query('SELECT id FROM public.platform_roles WHERE id=$1', [input.parent_role_id]);
    if (!parent.rowCount) throw new ApiError(400, 'Parent role was not found');
    const cycle = await pool.query(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM public.platform_roles WHERE id=$1
         UNION
         SELECT child.id FROM public.platform_roles child
         JOIN descendants parent ON child.parent_role_id=parent.id
       )
       SELECT id FROM descendants WHERE id=$2`,
      [id, input.parent_role_id]
    );
    if (cycle.rowCount) throw new ApiError(400, 'A platform role cannot be assigned to itself or one of its child roles');
  }
  validateRoleAccessSize(input.permissions);
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['name', 'description', 'parent_role_id', 'permission_type', 'permissions'] as const) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      values.push(key === 'permissions' && input.permissions !== null ? JSON.stringify(input.permissions) : input[key]);
      fields.push(`${key}=$${values.length}${key === 'permissions' ? '::jsonb' : ''}`);
    }
  }
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE public.platform_roles SET ${fields.join(', ')}, updated_at=NOW()
      WHERE id=$${values.length}
      RETURNING id, name, description, parent_role_id, permission_type, permissions, created_at, updated_at`,
    values
  );
  if (!rows.length) throw new ApiError(404, 'Platform role not found');
  res.json({ success: true, data: rows[0] });
}));
router.delete('/platform-roles/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  await assertRoleWithinCurrentHierarchy(req, id, false);
  const { rowCount } = await pool.query('DELETE FROM public.platform_roles WHERE id=$1', [id]);
  if (!rowCount) throw new ApiError(404, 'Platform role not found');
  res.json({ success: true });
}));

// Pricing tiers
router.get('/subscription-plans', handler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days
       FROM public.platform_pricing_tiers WHERE active=TRUE ORDER BY amount_cents, name`
  );
  res.json({ success: true, data: rows });
}));
router.get('/pricing-tiers', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const { rows } = await pool.query(
    `SELECT id, name, description, amount_cents, currency, billing_interval, trial_days, features, limits,
            active, created_at, updated_at
       FROM public.platform_pricing_tiers ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.post('/pricing-tiers', handler(async (req, res) => {
  const input = tierSchema.parse(req.body);
  if (typeof input.amount_cents !== 'number' || !Number.isSafeInteger(input.amount_cents) || input.amount_cents < 0) {
    throw new ApiError(400, 'amount_cents must be a non-negative safe integer');
  }
  const { rows } = await pool.query(
    `INSERT INTO public.platform_pricing_tiers
       (name, description, amount_cents, currency, billing_interval, trial_days, features, limits, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)
     RETURNING id, name, description, amount_cents, currency, billing_interval, trial_days, features, limits, active, created_at, updated_at`,
    [input.name, input.description || null, input.amount_cents, input.currency, input.billing_interval,
      input.trial_days, JSON.stringify(input.features), JSON.stringify(input.limits), input.active]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.put('/pricing-tiers/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = tierSchema.parse(req.body);
  if (typeof input.amount_cents !== 'number' || !Number.isSafeInteger(input.amount_cents) || input.amount_cents < 0) {
    throw new ApiError(400, 'amount_cents must be a non-negative safe integer');
  }
  const { rows } = await pool.query(
    `UPDATE public.platform_pricing_tiers
        SET name=$1, description=$2, amount_cents=$3, currency=$4, billing_interval=$5,
            trial_days=$6, features=$7::jsonb, limits=$8::jsonb, active=$9, updated_at=NOW()
      WHERE id=$10
      RETURNING id, name, description, amount_cents, currency, billing_interval, trial_days, features, limits, active, created_at, updated_at`,
    [input.name, input.description || null, input.amount_cents, input.currency, input.billing_interval,
      input.trial_days, JSON.stringify(input.features), JSON.stringify(input.limits), input.active, id]
  );
  if (!rows.length) throw new ApiError(404, 'Pricing tier not found');
  res.json({ success: true, data: rows[0] });
}));
router.delete('/pricing-tiers/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM public.platform_pricing_tiers WHERE id=$1', [id]);
  if (!rowCount) throw new ApiError(404, 'Pricing tier not found');
  res.json({ success: true });
}));

// All subscriptions (cross-tenant, optional tenant_id filter)
router.get('/subscriptions', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const tenantId = req.query.tenant_id === undefined ? null : tenantIdFrom(String(req.query.tenant_id));
  const { rows } = await pool.query(
    `SELECT s.id, s.tenant_id, st.name AS tenant_name, s.pricing_tier_id, s.status, s.starts_at, s.ends_at,
            s.auto_renew, s.notes, s.created_at, s.updated_at,
            t.name AS tier_name, t.amount_cents, t.currency, t.billing_interval, t.trial_days,
            st.slug AS tenant_slug
       FROM public.platform_subscriptions s
       LEFT JOIN public.platform_pricing_tiers t ON t.id=s.pricing_tier_id
       LEFT JOIN public.saas_tenants st ON st.id=s.tenant_id
      WHERE ($1::bigint IS NULL OR s.tenant_id=$1)
      ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  res.json({ success: true, data: rows });
}));

// All users (cross-tenant, optional tenant_id filter)
router.get('/users', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const tenantId = req.query.tenant_id === undefined ? null : tenantIdFrom(String(req.query.tenant_id));
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, u.view_permission, u.role_id, u.image, u.created_at, u.updated_at,
            r.name AS role_name, st.name AS tenant_name, u.tenant_id
       FROM public.users u
       LEFT JOIN public.roles r ON r.id=u.role_id AND r.tenant_id=u.tenant_id
       LEFT JOIN public.saas_tenants st ON st.id=u.tenant_id
      WHERE ($1::bigint IS NULL OR u.tenant_id=$1)
      ORDER BY u.id DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  res.json({ success: true, data: rows });
}));

// All roles (cross-tenant, optional tenant_id filter)
router.get('/roles', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const tenantId = req.query.tenant_id === undefined ? null : tenantIdFrom(String(req.query.tenant_id));
  const { rows } = await pool.query(
    `SELECT r.id, r.name, r.description, r.permission_type, r.created_by, r.created_at, r.updated_at,
            st.name AS tenant_name, r.tenant_id
       FROM public.roles r
       LEFT JOIN public.saas_tenants st ON st.id=r.tenant_id
      WHERE ($1::bigint IS NULL OR r.tenant_id=$1)
      ORDER BY r.id DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  res.json({ success: true, data: rows });
}));

// Tenant subscriptions (scoped to single tenant)
router.get('/tenants/:tenantId/subscriptions', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  await tenantExists(tenantId);
  const { rows } = await pool.query(
    `SELECT s.id, s.tenant_id, s.pricing_tier_id, s.status, s.starts_at, s.ends_at,
            s.auto_renew, s.notes, s.created_at, s.updated_at,
            t.name AS tier_name, t.amount_cents, t.currency, t.billing_interval, t.trial_days,
            st.name AS tenant_name, st.slug AS tenant_slug
       FROM public.platform_subscriptions s
       LEFT JOIN public.platform_pricing_tiers t ON t.id=s.pricing_tier_id
       LEFT JOIN public.saas_tenants st ON st.id=s.tenant_id
      WHERE s.tenant_id=$1 ORDER BY s.created_at DESC`,
    [tenantId]
  );
  res.json({ success: true, data: rows });
}));
router.post('/tenants/:tenantId/subscriptions', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const input = subscriptionSchema.parse(req.body);
  await tenantExists(tenantId);
  let planTrialDays: number | null = null;
  if (input.pricing_tier_id) {
    const tier = await pool.query<{ id: number; trial_days: number }>(
      'SELECT id, trial_days FROM public.platform_pricing_tiers WHERE id=$1 AND active=TRUE',
      [input.pricing_tier_id]
    );
    if (!tier.rowCount) throw new ApiError(400, 'An active pricing tier is required');
    planTrialDays = tier.rows[0].trial_days;
  }
  const endsAt = input.ends_at ?? (input.status === 'trialing'
    ? new Date(Date.now() + (input.trial_days ?? planTrialDays ?? 14) * 24 * 60 * 60 * 1000).toISOString()
    : null);
  const { rows } = await pool.query(
    `INSERT INTO public.platform_subscriptions
       (tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes)
     VALUES ($1,$2,$3,COALESCE($4::timestamptz,NOW()),$5,$6,$7)
     RETURNING id, tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at`,
    [tenantId, input.pricing_tier_id || null, input.status, input.starts_at || null,
      endsAt, input.auto_renew, input.notes || null]
  );
  await pool.query(
    `UPDATE public.saas_tenants
        SET plan=COALESCE((SELECT name FROM public.platform_pricing_tiers WHERE id=$1), 'Trial'),
            updated_at=NOW()
      WHERE id=$2`,
    [input.pricing_tier_id || null, tenantId]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.patch('/tenants/:tenantId/subscriptions/:subscriptionId', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const subscriptionId = tenantIdFrom(req.params.subscriptionId);
  const input = subscriptionSchema.partial().parse(req.body);
  if (!Object.keys(input).length) throw new ApiError(400, 'At least one subscription field is required');
  if (input.pricing_tier_id) {
    const tier = await pool.query('SELECT id FROM public.platform_pricing_tiers WHERE id=$1', [input.pricing_tier_id]);
    if (!tier.rowCount) throw new ApiError(400, 'Pricing tier not found');
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  const allowed = ['pricing_tier_id', 'status', 'starts_at', 'ends_at', 'auto_renew', 'notes'] as const;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      values.push(input[key]);
      fields.push(`${key}=$${values.length}`);
    }
  }
  if (!fields.length) throw new ApiError(400, 'At least one updatable subscription field is required');
  values.push(subscriptionId, tenantId);
  const { rows } = await pool.query(
    `UPDATE public.platform_subscriptions SET ${fields.join(', ')}, updated_at=NOW()
      WHERE id=$${values.length - 1} AND tenant_id=$${values.length}
      RETURNING id, tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at`,
    values
  );
  if (!rows.length) throw new ApiError(404, 'Subscription not found for this organization');
  if (Object.prototype.hasOwnProperty.call(input, 'pricing_tier_id')) {
    await pool.query(
      `UPDATE public.saas_tenants
          SET plan=COALESCE((SELECT name FROM public.platform_pricing_tiers WHERE id=$1), 'Trial'),
              updated_at=NOW()
        WHERE id=$2`,
      [input.pricing_tier_id || null, tenantId]
    );
  }
  res.json({ success: true, data: rows[0] });
}));
router.patch('/tenants/:tenantId/subscriptions/:subscriptionId/status', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const subscriptionId = tenantIdFrom(req.params.subscriptionId);
  const { status } = z.object({ status: z.enum(['trialing', 'active', 'past_due', 'cancelled', 'expired']) }).parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.platform_subscriptions SET status=$1, updated_at=NOW()
      WHERE id=$2 AND tenant_id=$3
      RETURNING id, tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, updated_at`,
    [status, subscriptionId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Subscription not found for this organization');
  res.json({ success: true, data: rows[0] });
}));

// Payments: listing, manual records, Razorpay order and verified payment.
router.get('/payments', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const filters = z.object({
    tenant_id: idSchema.optional(),
    status: z.enum(['created', 'recorded', 'pending', 'paid', 'failed', 'refunded']).optional(),
    search: z.string().trim().max(191).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).superRefine((value, context) => {
    for (const [field, date] of [['date_from', value.date_from], ['date_to', value.date_to]] as const) {
      if (date && new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'A valid calendar date is required' });
      }
    }
    if (value.date_from && value.date_to && value.date_from > value.date_to) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['date_to'], message: 'date_to must be on or after date_from' });
    }
  }).parse(req.query);
  const { rows } = await pool.query(
    `SELECT p.id, p.tenant_id, t.name AS tenant_name, p.subscription_id, p.amount_cents,
            p.currency, p.status, p.method, p.provider_order_id, p.provider_payment_id,
            p.reference, p.notes, p.paid_at, p.created_at, p.updated_at
       FROM public.platform_payments p
       JOIN public.saas_tenants t ON t.id=p.tenant_id
      WHERE ($1::bigint IS NULL OR p.tenant_id=$1)
        AND ($2::text IS NULL OR p.status=$2)
        AND ($3::date IS NULL OR p.created_at >= $3::date)
        AND ($4::date IS NULL OR p.created_at < $4::date + INTERVAL '1 day')
        AND ($5::text IS NULL OR CONCAT_WS(' ', t.name, p.status, p.method,
              p.provider_order_id, p.provider_payment_id, p.reference, p.notes) ILIKE '%' || $5 || '%')
      ORDER BY p.created_at DESC LIMIT $6 OFFSET $7`,
    [filters.tenant_id || null, filters.status || null, filters.date_from || null, filters.date_to || null,
      filters.search || null, limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.post('/payments', handler(async (req, res) => {
  const input = z.object({
    tenant_id: z.number().int().positive(),
    amount_cents: z.number().int().positive().safe().max(100_000_000_000),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
    subscription_id: z.number().int().positive().nullable().optional(),
    status: z.enum(['recorded', 'paid', 'pending', 'failed', 'refunded']).default('recorded'),
    reference: z.string().trim().max(191).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  }).parse(req.body);
  await tenantExists(input.tenant_id);
  const payment = await createManualPayment(input.tenant_id, input);
  res.status(201).json({ success: true, data: payment });
}));
router.get('/tenants/:tenantId/payments', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const { limit, offset } = pageParams(req);
  await tenantExists(tenantId);
  const { rows } = await pool.query(
    `SELECT id, tenant_id, subscription_id, amount_cents, currency, status, method,
            provider_order_id, provider_payment_id, reference, notes, paid_at, created_at, updated_at
       FROM public.platform_payments WHERE tenant_id=$1
      ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.post('/tenants/:tenantId/payments', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const input = z.object({
    amount_cents: z.number().int().positive().safe().max(100_000_000_000),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('USD'),
    subscription_id: z.number().int().positive().nullable().optional(),
    status: z.enum(['recorded', 'paid', 'pending', 'failed', 'refunded']).default('recorded'),
    reference: z.string().trim().max(191).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  }).parse(req.body);
  await tenantExists(tenantId);
  const payment = await createManualPayment(tenantId, input);
  res.status(201).json({ success: true, data: payment });
}));
router.post('/tenants/:tenantId/payments/razorpay/orders', handler(async (req, res) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Razorpay order creation is not configured');
  }
  const tenantId = tenantIdFrom(req.params.tenantId);
  const input = z.object({
    amount_cents: z.number().int().positive().safe().max(100_000_000_000),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('INR'),
    subscription_id: z.number().int().positive().nullable().optional(),
    receipt: z.string().trim().max(40).optional(),
  }).parse(req.body);
  await tenantExists(tenantId);
  if (input.subscription_id) {
    const sub = await pool.query('SELECT id FROM public.platform_subscriptions WHERE id=$1 AND tenant_id=$2', [input.subscription_id, tenantId]);
    if (!sub.rowCount) throw new ApiError(400, 'Subscription does not belong to this organization');
  }
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount_cents,
      currency: input.currency,
      receipt: input.receipt || `tenant-${tenantId}-${Date.now()}`,
      notes: { tenant_id: String(tenantId) },
    }),
  });
  if (!response.ok) throw new ApiError(502, 'Razorpay could not create the payment order');
  const order = await response.json() as { id?: string; amount?: number; currency?: string; status?: string };
  if (!order.id) throw new ApiError(502, 'Razorpay returned an invalid payment order');
  const { rows } = await pool.query(
    `INSERT INTO public.platform_payments
       (tenant_id, subscription_id, amount_cents, currency, status, method, provider_order_id)
     VALUES ($1,$2,$3,$4,'pending','razorpay',$5)
     RETURNING id, tenant_id, subscription_id, amount_cents, currency, status, provider_order_id, created_at`,
    [tenantId, input.subscription_id || null, input.amount_cents, input.currency, order.id]
  );
  res.status(201).json({ success: true, data: { payment: rows[0], order: { id: order.id, amount: order.amount, currency: order.currency, status: order.status }, key_id: env.RAZORPAY_KEY_ID } });
}));
router.post('/tenants/:tenantId/payments/razorpay/verify', handler(async (req, res) => {
  if (!env.RAZORPAY_KEY_SECRET) throw new ApiError(503, 'Razorpay payment verification is not configured');
  const tenantId = tenantIdFrom(req.params.tenantId);
  const input = z.object({
    razorpay_order_id: z.string().trim().min(1).max(120),
    razorpay_payment_id: z.string().trim().min(1).max(120),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
  }).parse(req.body);
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest('hex');
  if (!sameLengthEqual(input.razorpay_signature, expected)) throw new ApiError(401, 'Invalid Razorpay payment signature');
  const payment = await markRazorpayPaymentPaid(input.razorpay_order_id, input.razorpay_payment_id, tenantId);
  if (!payment || payment.status !== 'paid' || payment.provider_payment_id !== input.razorpay_payment_id) {
    throw new ApiError(404, 'Payment order not found for this organization');
  }
  res.json({ success: true, data: payment });
}));

// Public notifications are global platform records, not tenant notifications.
router.get('/notifications', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const { rows } = await pool.query(
    `SELECT id, title, message, type, is_read, created_at
       FROM public.platform_notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.post('/notifications', handler(async (req, res) => {
  const input = z.object({
    title: z.string().trim().min(1).max(191),
    message: z.string().trim().min(1).max(10000),
    type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
    email_to: z.string().trim().email().max(255).optional(),
  }).parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.platform_notifications (title, message, type)
     VALUES ($1,$2,$3) RETURNING id, title, message, type, is_read, created_at`,
    [input.title, input.message, input.type]
  );
  const emailSent = input.email_to
    ? await sendRealMail({
        to: input.email_to,
        subject: input.title,
        text: input.message,
        html: `<p>${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>`,
      })
    : null;
  res.status(201).json({
    success: true,
    data: rows[0],
    email_sent: emailSent,
    message: emailSent === false ? 'Notification saved, but email delivery failed. Check SMTP configuration.' : undefined,
  });
}));
router.delete('/notifications', handler(async (_req, res) => {
  await pool.query('DELETE FROM public.platform_notifications');
  res.json({ success: true });
}));
router.patch('/notifications/:id/read', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = z.object({ is_read: z.boolean().default(true) }).parse(req.body || {});
  const { rows } = await pool.query(
    `UPDATE public.platform_notifications SET is_read=$1 WHERE id=$2
     RETURNING id, title, message, type, is_read, created_at`,
    [input.is_read, id]
  );
  if (!rows.length) throw new ApiError(404, 'Notification not found');
  res.json({ success: true, data: rows[0] });
}));
router.delete('/notifications/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM public.platform_notifications WHERE id=$1', [id]);
  if (!rowCount) throw new ApiError(404, 'Notification not found');
  res.json({ success: true });
}));

// Global email templates
router.get('/email-templates', handler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, subject, content, created_at, updated_at
       FROM public.platform_email_templates ORDER BY name`
  );
  res.json({ success: true, data: rows });
}));
router.post('/email-templates', handler(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(191),
    subject: z.string().trim().min(1).max(255),
    content: z.string().min(1).max(100000),
  }).parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO public.platform_email_templates (name, subject, content)
     VALUES ($1,$2,$3) RETURNING id, name, subject, content, created_at, updated_at`,
    [input.name, input.subject, input.content]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.put('/email-templates/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = z.object({
    name: z.string().trim().min(1).max(191),
    subject: z.string().trim().min(1).max(255),
    content: z.string().min(1).max(100000),
  }).parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.platform_email_templates SET name=$1, subject=$2, content=$3, updated_at=NOW()
      WHERE id=$4 RETURNING id, name, subject, content, created_at, updated_at`,
    [input.name, input.subject, input.content, id]
  );
  if (!rows.length) throw new ApiError(404, 'Email template not found');
  res.json({ success: true, data: rows[0] });
}));
router.delete('/email-templates/:id', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM public.platform_email_templates WHERE id=$1', [id]);
  if (!rowCount) throw new ApiError(404, 'Email template not found');
  res.json({ success: true });
}));

// SMTP secrets are encrypted with AES-256-GCM and never returned to callers.
router.get('/smtp-config', handler(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM public.platform_smtp_config WHERE id=1');
  res.json({ success: true, data: publicSmtp(rows[0]) });
}));
router.put('/smtp-config', handler(async (req, res) => {
  const input = z.object({
    host: z.string().trim().max(255).nullable().optional(),
    port: z.number().int().min(1).max(65535).nullable().optional(),
    secure: z.boolean().optional(),
    username: z.string().trim().max(255).nullable().optional(),
    password: z.string().min(1).max(500).optional(),
    clear_password: z.boolean().default(false),
    from_email: z.string().email().max(255).nullable().optional(),
    from_name: z.string().trim().max(191).nullable().optional(),
  }).parse(req.body);
  let encrypted: string | null | undefined;
  if (input.password) encrypted = encryptSecret(input.password);
  else if (input.clear_password) encrypted = null;
  if (!Object.keys(input).some((key) => key !== 'password' && key !== 'clear_password') && encrypted === undefined) {
    throw new ApiError(400, 'At least one SMTP setting must be supplied');
  }
  const { rows } = await pool.query(
    `UPDATE public.platform_smtp_config SET
       host=CASE WHEN $1 THEN $2 ELSE host END,
       port=CASE WHEN $3 THEN $4 ELSE port END,
       secure=CASE WHEN $5 THEN $6 ELSE secure END,
       username=CASE WHEN $7 THEN $8 ELSE username END,
       password_encrypted=CASE WHEN $9 THEN $10 ELSE password_encrypted END,
       from_email=CASE WHEN $11 THEN $12 ELSE from_email END,
       from_name=CASE WHEN $13 THEN $14 ELSE from_name END,
       updated_at=NOW()
     WHERE id=1 RETURNING *`,
    [
      Object.prototype.hasOwnProperty.call(input, 'host'), input.host ?? null,
      Object.prototype.hasOwnProperty.call(input, 'port'), input.port ?? null,
      Object.prototype.hasOwnProperty.call(input, 'secure'), input.secure ?? null,
      Object.prototype.hasOwnProperty.call(input, 'username'), input.username ?? null,
      encrypted !== undefined, encrypted ?? null,
      Object.prototype.hasOwnProperty.call(input, 'from_email'), input.from_email ?? null,
      Object.prototype.hasOwnProperty.call(input, 'from_name'), input.from_name ?? null,
    ]
  );
  res.json({ success: true, data: publicSmtp(rows[0]) });
}));
router.post('/smtp-config/test', handler(async (_req, res) => {
  const result = await testSmtpConnection();
  if (!result.success) throw new ApiError(400, result.message);
  res.json({ success: true, message: result.message });
}));

// Tenant-scoped user, role, and role access controls. Every query includes the
// explicit tenant ID; password hashes and authentication secrets are excluded.
router.get('/tenants/:tenantId/users', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const { limit, offset } = pageParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : null;
  await tenantExists(tenantId);
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, u.view_permission, u.role_id, u.image, u.created_at, u.updated_at,
            r.name AS role_name
       FROM public.users u LEFT JOIN public.roles r ON r.id=u.role_id AND r.tenant_id=u.tenant_id
      WHERE u.tenant_id=$1
        AND ($2::text IS NULL OR u.name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
      ORDER BY u.id LIMIT $3 OFFSET $4`,
    [tenantId, search, limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.patch('/tenants/:tenantId/users/:userId', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const userId = tenantIdFrom(req.params.userId);
  const input = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
    status: z.boolean().optional(),
    view_permission: z.enum(['global', 'group', 'individual']).optional(),
    role_id: z.number().int().positive().optional(),
    image: z.string().max(255).nullable().optional(),
  }).parse(req.body);
  if (!Object.keys(input).length) throw new ApiError(400, 'At least one user field is required');
  if (input.role_id) {
    const role = await pool.query('SELECT id FROM public.roles WHERE id=$1 AND tenant_id=$2', [input.role_id, tenantId]);
    if (!role.rowCount) throw new ApiError(400, 'Role does not belong to this organization');
  }
  const columns = ['name', 'email', 'status', 'view_permission', 'role_id', 'image'] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(input, column)) {
      values.push(input[column]);
      sets.push(`${column}=$${values.length}`);
    }
  }
  values.push(userId, tenantId);
  const { rows } = await pool.query(
    `UPDATE public.users SET ${sets.join(', ')}, updated_at=NOW()
      WHERE id=$${values.length - 1} AND tenant_id=$${values.length}
      RETURNING id, name, email, status, view_permission, role_id, image, created_at, updated_at`,
    values
  );
  if (!rows.length) throw new ApiError(404, 'User not found for this organization');
  res.json({ success: true, data: rows[0] });
}));
const roleInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  permission_type: z.enum(['all', 'custom']).default('custom'),
  permissions: z.record(z.string(), z.unknown()).nullable().optional(),
  parent_role_id: idSchema.nullable().optional(),
});
const validateParentRole = async (tenantId: number, parentRoleId: number | null | undefined, roleId?: number): Promise<void> => {
  if (parentRoleId == null) return;
  const { rowCount } = await pool.query(
    'SELECT id FROM public.roles WHERE id=$1 AND tenant_id=$2',
    [parentRoleId, tenantId]
  );
  if (!rowCount) throw new ApiError(400, 'Parent role must belong to this organization');
  if (!roleId) return;
  const descendants = await pool.query(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM public.roles WHERE id=$1 AND tenant_id=$2
       UNION
       SELECT child.id FROM public.roles child
       JOIN descendants parent ON child.parent_role_id=parent.id
       WHERE child.tenant_id=$2
     )
     SELECT id FROM descendants WHERE id=$3`,
    [roleId, tenantId, parentRoleId]
  );
  if (descendants.rowCount) throw new ApiError(400, 'A role cannot be assigned to itself or one of its child roles');
};
const validateRoleAccessSize = (permissions: unknown): void => {
  if (permissions !== undefined && JSON.stringify(permissions).length > 50000) {
    throw new ApiError(400, 'Role access data exceeds the maximum size');
  }
};
router.get('/tenants/:tenantId/roles', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  await tenantExists(tenantId);
  const { rows } = await pool.query(
    `SELECT id, name, description, permission_type, permissions, parent_role_id, created_by, created_at, updated_at
       FROM public.roles WHERE tenant_id=$1 ORDER BY id`,
    [tenantId]
  );
  res.json({ success: true, data: rows });
}));
router.post('/tenants/:tenantId/roles', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const input = roleInputSchema.parse(req.body);
  validateRoleAccessSize(input.permissions);
  await validateParentRole(tenantId, input.parent_role_id);
  const { rows } = await pool.query(
    `INSERT INTO public.roles (name, description, permission_type, permissions, parent_role_id, tenant_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,NOW(),NOW())
     RETURNING id, name, description, permission_type, permissions, parent_role_id, created_at, updated_at`,
    [input.name, input.description || null, input.permission_type,
      input.permissions == null ? null : JSON.stringify(input.permissions), input.parent_role_id ?? null, tenantId]
  );
  res.status(201).json({ success: true, data: rows[0] });
}));
router.patch('/tenants/:tenantId/roles/:roleId', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const roleId = tenantIdFrom(req.params.roleId);
  const input = roleInputSchema.partial().parse(req.body);
  validateRoleAccessSize(input.permissions);
  if (!Object.keys(input).length) throw new ApiError(400, 'At least one role field is required');
  await validateParentRole(tenantId, input.parent_role_id, roleId);
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['name', 'description', 'permission_type', 'permissions', 'parent_role_id'] as const) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      values.push(key === 'permissions' && input.permissions !== null ? JSON.stringify(input.permissions) : input[key]);
      fields.push(`${key}=$${values.length}${key === 'permissions' ? '::jsonb' : ''}`);
    }
  }
  values.push(roleId, tenantId);
  const { rows } = await pool.query(
    `UPDATE public.roles SET ${fields.join(', ')}, updated_at=NOW()
      WHERE id=$${values.length - 1} AND tenant_id=$${values.length}
      RETURNING id, name, description, permission_type, permissions, parent_role_id, created_at, updated_at`,
    values
  );
  if (!rows.length) throw new ApiError(404, 'Role not found for this organization');
  res.json({ success: true, data: rows[0] });
}));
router.get('/tenants/:tenantId/roles/:roleId/access', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const roleId = tenantIdFrom(req.params.roleId);
  const { rows } = await pool.query(
    `SELECT id, permission_type, permissions FROM public.roles WHERE id=$1 AND tenant_id=$2`,
    [roleId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Role not found for this organization');
  res.json({ success: true, data: rows[0] });
}));
router.put('/tenants/:tenantId/roles/:roleId/access', handler(async (req, res) => {
  const tenantId = tenantIdFrom(req.params.tenantId);
  const roleId = tenantIdFrom(req.params.roleId);
  const input = z.object({
    permission_type: z.enum(['all', 'custom']),
    permissions: z.record(z.string(), z.unknown()).nullable(),
  }).parse(req.body);
  if (JSON.stringify(input.permissions).length > 50000) throw new ApiError(400, 'Role access data exceeds the maximum size');
  const { rows } = await pool.query(
    `UPDATE public.roles SET permission_type=$1, permissions=$2::jsonb, updated_at=NOW()
      WHERE id=$3 AND tenant_id=$4
      RETURNING id, permission_type, permissions`,
    [input.permission_type, input.permissions === null ? null : JSON.stringify(input.permissions), roleId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Role not found for this organization');
  res.json({ success: true, data: rows[0] });
}));

// Demo request administration
router.get('/demo-requests', handler(async (req, res) => {
  const { limit, offset } = pageParams(req);
  const { rows } = await pool.query(
    `SELECT id, name, email, company, phone, message, status, notes, trial_tenant_id,
            created_at, updated_at
       FROM public.platform_demo_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ success: true, data: rows });
}));
router.patch('/demo-requests/:id/status', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = z.object({
    status: z.enum(['new', 'contacted', 'qualified', 'closed']).optional(),
    notes: z.string().max(5000).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0, 'At least one demo field is required').parse(req.body);
  const { rows } = await pool.query(
    `UPDATE public.platform_demo_requests
        SET status=COALESCE($1, status), notes=CASE WHEN $2 THEN $3 ELSE notes END, updated_at=NOW()
      WHERE id=$4
      RETURNING id, name, email, company, phone, message, status, notes, trial_tenant_id, created_at, updated_at`,
    [input.status || null, Object.prototype.hasOwnProperty.call(input, 'notes'), input.notes ?? null, id]
  );
  if (!rows.length) throw new ApiError(404, 'Demo request not found');
  res.json({ success: true, data: rows[0] });
}));
router.post('/demo-requests/:id/activate-trial', handler(async (req, res) => {
  const id = tenantIdFrom(req.params.id);
  const input = z.object({
    trial_days: z.number().int().min(1).max(365).default(14),
    admin_password: z.string().min(8).max(50),
    pricing_tier_id: z.union([idSchema, z.null()]).optional(),
  }).parse(req.body);
  const demoResult = await pool.query(
    `SELECT id, name, email, company, phone, trial_tenant_id
       FROM public.platform_demo_requests WHERE id=$1`,
    [id]
  );
  const demo = demoResult.rows[0];
  if (!demo) throw new ApiError(404, 'Demo request not found');
  if (demo.trial_tenant_id) throw new ApiError(409, 'A trial organization has already been activated for this demo request');
  let tier: { id: number; name: string } | null = null;
  if (input.pricing_tier_id) {
    const tierResult = await pool.query<{ id: number; name: string }>(
      'SELECT id, name FROM public.platform_pricing_tiers WHERE id=$1 AND active=TRUE',
      [input.pricing_tier_id]
    );
    tier = tierResult.rows[0] || null;
    if (!tier) throw new ApiError(400, 'The selected pricing tier is unavailable');
  }
  const baseSlug = String(demo.company || demo.name)
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'trial';
  let slug = baseSlug;
  for (let suffix = 1; ; suffix += 1) {
    const { rowCount } = await pool.query('SELECT id FROM public.saas_tenants WHERE slug=$1', [slug]);
    if (!rowCount) break;
    slug = `${baseSlug}-${suffix}`;
  }
  const trialExpiry = new Date(Date.now() + input.trial_days * 24 * 60 * 60 * 1000).toISOString();
  const result = await superAdminService.createTenant({
    name: String(demo.company || demo.name),
    slug,
    plan: tier?.name || 'Trial',
    admin_name: String(demo.name),
    admin_email: String(demo.email),
    admin_password: input.admin_password,
    email: String(demo.email),
    phone: demo.phone || undefined,
    trial_subscription: { pricing_tier_id: tier?.id || null, ends_at: trialExpiry },
  });
  const linkedDemo = await pool.query(
    `UPDATE public.platform_demo_requests SET trial_tenant_id=$1, status='closed', updated_at=NOW()
      WHERE id=$2 AND trial_tenant_id IS NULL RETURNING id`,
    [result.tenant.id, id]
  );
  if (!linkedDemo.rowCount) {
    await pool.query('DELETE FROM public.saas_tenants WHERE id=$1', [result.tenant.id]);
    throw new ApiError(409, 'A trial organization was activated for this demo request by another administrator');
  }
  const loginUrl = tenantLoginUrl(slug);
  const emailSent = await sendTemplateMail('trial_activation', String(demo.email), {
    name: String(demo.name),
    company: String(demo.company || demo.name),
    slug,
    login_url: loginUrl,
    email: String(demo.email),
    password: input.admin_password,
    trial_days: String(input.trial_days),
    trial_expiry: trialExpiry,
  }, {
    subject: `Your ${input.trial_days}-day CRM trial is ready`,
    html: `<p>Your CRM trial for <strong>${escapeHtml(String(demo.company || demo.name))}</strong> is ready.</p><p><a href="${escapeHtml(loginUrl)}">Sign in</a></p><p>Email: ${escapeHtml(String(demo.email))}<br>Temporary password: ${escapeHtml(input.admin_password)}<br>Trial expires: ${escapeHtml(trialExpiry)}</p>`,
  });
  await pool.query(
    `INSERT INTO public.platform_notifications (title, message, type)
     VALUES ($1,$2,'success')`,
    ['Trial activated', `A ${input.trial_days}-day trial was activated for ${String(demo.company || demo.name)} (${slug}).`]
  );
  res.status(201).json({
    success: true,
    data: {
      tenant_id: result.tenant.id,
      slug,
      admin_email: demo.email,
      login_url: loginUrl,
      trial_expiry: trialExpiry,
      email_sent: emailSent,
    },
    message: emailSent
      ? 'Trial activated and credentials emailed.'
      : 'Trial activated, but email delivery failed. Verify SMTP settings and contact the administrator directly.',
  });
}));

export default router;
