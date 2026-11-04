import { ApiError } from '@/middleware/errorHandler';
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '@/config/db';
import { requireSuperAdmin } from '@/middleware/superAdminAuth';
import { superAdminService } from '@/services/superAdmin.service';
import { getTenantProfile } from '@/routes/tenant.routes';
import { sendPlatformMail } from '@/utils/mailer';
import { logger } from '@/utils/logger';

const router = Router();

const parseTenantId = (value: string | string[]): number | null => {
  if (typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// All /api/admin/* endpoints require Super Admin authentication
router.use(requireSuperAdmin);

/**
 * GET /api/admin/organizations
 * Full organization list with computed status, latest payment info, and dynamic filters
 */
router.get('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, payment_status, date_field = 'expiry', date_from, date_to } = req.query;

    const { rows } = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.status,
        t.plan,
        t.logo_url,
        t.settings,
        t.created_at,
        t.updated_at,
        COALESCE(u.user_count, 0)::int as user_count,
        sub.starts_at as sub_starts_at,
        sub.ends_at as sub_ends_at,
        sub.status as sub_status,
        pt.name as tier_name,
        pay.status as latest_pay_status,
        pay.amount_cents as latest_pay_amount,
        pay.currency as latest_pay_currency,
        pay.method as latest_pay_method,
        pay.paid_at as latest_pay_date,
        COALESCE(p_count.cnt, 0)::int as payment_count
      FROM public.saas_tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int as user_count FROM public.users GROUP BY tenant_id
      ) u ON u.tenant_id = t.id
      LEFT JOIN (
        SELECT DISTINCT ON (tenant_id) tenant_id, starts_at, ends_at, status, pricing_tier_id
        FROM public.platform_subscriptions
        ORDER BY tenant_id, id DESC
      ) sub ON sub.tenant_id = t.id
      LEFT JOIN public.platform_pricing_tiers pt ON pt.id = sub.pricing_tier_id
      LEFT JOIN (
        SELECT DISTINCT ON (tenant_id) tenant_id, status, amount_cents, currency, method, paid_at, created_at
        FROM public.platform_payments
        ORDER BY tenant_id, id DESC
      ) pay ON pay.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*)::int as cnt FROM public.platform_payments GROUP BY tenant_id
      ) p_count ON p_count.tenant_id = t.id
      ORDER BY t.id DESC
    `);

    const now = new Date();

    let organizations = rows.map((r: any) => {
      const settings = r.settings || {};
      const subExpiry = r.sub_ends_at || settings.subscription_expiry_date || null;
      const subStart = r.sub_starts_at || settings.subscription_start_date || r.created_at;
      const planName = r.tier_name || r.plan || 'Starter';
      const planCode = (r.tier_name || r.plan || 'starter').toLowerCase();

      // Compute status matching NGO management logic
      let computedStatus = 'Active';
      if (r.status === 'suspended') {
        computedStatus = 'Suspended';
      } else if (subExpiry && new Date(subExpiry) < now) {
        computedStatus = 'Expired';
      } else if (planCode.includes('trial') || r.status === 'trial') {
        computedStatus = 'Trial';
      } else {
        computedStatus = 'Active';
      }

      // Compute payment status
      let paymentStatus = 'Unpaid';
      if (r.latest_pay_status === 'paid') {
        paymentStatus = 'Paid';
      } else if (r.latest_pay_status === 'pending') {
        paymentStatus = 'Pending';
      } else if (r.latest_pay_status === 'failed') {
        paymentStatus = 'Failed';
      } else if (computedStatus === 'Trial' || planCode.includes('trial')) {
        paymentStatus = 'Free Trial';
      }

      return {
        id: r.id,
        org_id: `ORG-${String(r.id).padStart(4, '0')}`,
        name: r.name,
        slug: r.slug,
        email: settings.email || null,
        phone: settings.phone || null,
        status: r.status !== 'suspended', // boolean
        computed_status: computedStatus,
        created_at: r.created_at,
        user_count: Number(r.user_count || 0),
        subscription_start_date: subStart,
        subscription_expiry_date: subExpiry,
        plan_name: planName,
        plan_code: planCode,
        payment_status: paymentStatus,
        latest_payment_amount: r.latest_pay_amount ? Number(r.latest_pay_amount) / 100 : null,
        latest_payment_currency: r.latest_pay_currency || 'INR',
        latest_payment_method: r.latest_pay_method || null,
        latest_payment_date: r.latest_pay_date || null,
        payment_count: r.payment_count || 0,
      };
    });

    // Apply search filter
    if (search && String(search).trim()) {
      const s = String(search).toLowerCase().trim();
      organizations = organizations.filter(
        (o: any) =>
          o.name?.toLowerCase().includes(s) ||
          o.slug?.toLowerCase().includes(s) ||
          o.email?.toLowerCase().includes(s) ||
          o.phone?.includes(s) ||
          o.org_id?.toLowerCase().includes(s)
      );
    }

    // Apply status filter
    if (status && status !== 'All') {
      organizations = organizations.filter(
        (o: any) => o.computed_status.toLowerCase() === String(status).toLowerCase()
      );
    }

    // Apply payment_status filter
    if (payment_status && payment_status !== 'All') {
      organizations = organizations.filter(
        (o: any) => o.payment_status?.toLowerCase() === String(payment_status).toLowerCase()
      );
    }

    // Apply date range filter
    if (date_from || date_to) {
      const fromDate = date_from ? new Date(String(date_from)) : null;
      const toDate = date_to ? new Date(String(date_to)) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);

      organizations = organizations.filter((o: any) => {
        let targetDateStr = o.subscription_expiry_date;
        if (date_field === 'created') targetDateStr = o.created_at;
        if (date_field === 'start') targetDateStr = o.subscription_start_date;
        if (!targetDateStr) return false;

        const targetDate = new Date(targetDateStr);
        if (fromDate && targetDate < fromDate) return false;
        if (toDate && targetDate > toDate) return false;
        return true;
      });
    }

    res.json({ success: true, data: organizations });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/organizations/:id
 * Full single organization details
 */
router.get('/organizations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const profile = await getTenantProfile(id);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const settings = profile.settings || {};
    const addr = profile.address || {};
    const now = new Date();
    const expiry = settings.subscription_expiry_date || null;
    let computedStatus = 'Active';
    if (profile.status === 'suspended') {
      computedStatus = 'Suspended';
    } else if (expiry && new Date(expiry) < now) {
      computedStatus = 'Expired';
    } else if (profile.plan?.toLowerCase().includes('trial') || profile.status === 'trial') {
      computedStatus = 'Trial';
    }

    const result = {
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
      domain: profile.domain,
      status: profile.status !== 'suspended',
      computed_status: computedStatus,
      email: profile.email || settings.email || '',
      phone: profile.phone || settings.phone || '',
      ngo_type: settings.ngo_type || '',
      ngo_objective: settings.ngo_objective || settings.description || '',
      registration_no: profile.registration_no || settings.registration_no || '',
      registration_date: settings.registration_date || null,
      date_of_establishment: profile.established_date || settings.established_date || null,
      registered_under_act: settings.registered_under_act || '',
      website_url: profile.website || settings.website_url || settings.website || '',
      social_media_links: settings.social_media_links || '',
      ceo_name: settings.ceo_name || '',
      ceo_contact: settings.ceo_contact || '',
      chairperson_name: settings.chairperson_name || '',
      chairperson_contact: settings.chairperson_contact || '',
      subscription_start_date: settings.subscription_start_date || profile.created_at,
      subscription_expiry_date: settings.subscription_expiry_date || null,
      street: addr.street || settings.street || '',
      address: addr.street || settings.address || '',
      state_id: settings.state_id || null,
      city_id: settings.city_id || null,
      postal_code: addr.pincode || settings.postal_code || '',
      pincode: addr.pincode || settings.pincode || '',
      country: addr.country || settings.country || 'India',
      address_type: settings.address_type || 'Registered Office',
      admin: profile.admin,
      stats: profile.stats,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/organizations
 * Create new organization
 */
router.post('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      plan = 'Starter',
      admin_name,
      admin_email,
      admin_password,
      registration_no,
      email,
      phone,
      website_url,
      website,
      date_of_establishment,
      established_date,
      currency = 'INR',
      timezone = 'Asia/Kolkata',
      logo_url,
      street,
      city,
      state,
      country = 'India',
      pincode,
      postal_code,
      address,
      subscription_start_date,
      subscription_expiry_date,
      ngo_type,
      ngo_objective,
      registered_under_act,
      social_media_links,
      ceo_name,
      ceo_contact,
      chairperson_name,
      chairperson_contact,
      state_id,
      city_id,
      address_type,
    } = req.body;

    const effectiveSlug = (slug || name)
      ? String(slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : '';

    if (!name || !effectiveSlug || !admin_name || !admin_email || !admin_password) {
      res.status(400).json({
        success: false,
        message: 'name, slug, admin_name, admin_email, and admin_password are required',
      });
      return;
    }

    if (phone && (!/^[6-9]\d{9}$/.test(String(phone).trim()) || /^(\d)\1{9}$/.test(String(phone).trim()))) {
      res.status(400).json({
        success: false,
        message: 'Phone number must be a valid 10-digit number starting with 6, 7, 8, or 9 (cannot be all identical digits).',
      });
      return;
    }

    const result = await superAdminService.createTenant({
      name,
      slug: effectiveSlug,
      plan,
      admin_name,
      admin_email,
      admin_password,
      registration_no,
      email: email || admin_email,
      phone,
      website: website_url || website,
      established_date: date_of_establishment || established_date,
      currency,
      timezone,
      logo_url,
      street: street || address,
      city,
      state,
      country,
      pincode: pincode || postal_code,
      address: street || address,
    });

    // Save extra metadata into settings
    if (result.tenant?.id) {
      const extraSettings = {
        ngo_type,
        ngo_objective,
        registered_under_act,
        social_media_links,
        ceo_name,
        ceo_contact,
        chairperson_name,
        chairperson_contact,
        subscription_start_date: subscription_start_date || new Date().toISOString(),
        subscription_expiry_date,
        state_id,
        city_id,
        address_type,
      };

      await pool.query(
        `UPDATE public.saas_tenants 
         SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb 
         WHERE id = $2`,
        [JSON.stringify(extraSettings), result.tenant.id]
      );

      if (subscription_expiry_date) {
        await superAdminService.updateOrganizationExpiry(result.tenant.id, subscription_expiry_date);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Organization and admin user created successfully',
      data: {
        ...(result.tenant || {}),
        tenant: result.tenant,
        adminUser: result.adminUser,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/organizations/:id
 * Update organization details
 */
router.put('/organizations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const {
      name,
      slug,
      plan,
      email,
      phone,
      website_url,
      website,
      date_of_establishment,
      established_date,
      registration_no,
      street,
      address,
      pincode,
      postal_code,
      country,
      subscription_start_date,
      subscription_expiry_date,
      ngo_type,
      ngo_objective,
      registered_under_act,
      social_media_links,
      ceo_name,
      ceo_contact,
      chairperson_name,
      chairperson_contact,
      state_id,
      city_id,
      address_type,
    } = req.body;

    const result = await superAdminService.updateTenant(id, {
      name,
      slug,
      plan,
      email,
      phone,
      website: website_url || website,
      established_date: date_of_establishment || established_date,
      registration_no,
      street: street || address,
      address: street || address,
      pincode: pincode || postal_code,
      country,
    });

    // Update custom settings
    const extraSettings = {
      ngo_type,
      ngo_objective,
      registered_under_act,
      social_media_links,
      ceo_name,
      ceo_contact,
      chairperson_name,
      chairperson_contact,
      subscription_start_date,
      subscription_expiry_date,
      state_id,
      city_id,
      address_type,
    };

    await pool.query(
      `UPDATE public.saas_tenants 
       SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb 
       WHERE id = $2`,
      [JSON.stringify(extraSettings), id]
    );

    if (subscription_expiry_date) {
      await superAdminService.updateOrganizationExpiry(id, subscription_expiry_date);
    }

    const updatedProfile = await getTenantProfile(id);
    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: updatedProfile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/organizations/:id/status
 * Toggle status between active and suspended
 */
router.patch('/organizations/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    let { status } = req.body;
    if (typeof status === 'boolean') {
      status = status ? 'active' : 'suspended';
    }
    if (!['active', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, message: "Status must be 'active' or 'suspended'" });
      return;
    }

    const tenant = await superAdminService.updateTenantStatus(id, status);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/organizations/:id/expiry
 * Update organization subscription expiry date
 */
router.patch('/organizations/:id/expiry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const { expiry_date } = req.body;
    if (!expiry_date) {
      res.status(400).json({ success: false, message: 'expiry_date is required' });
      return;
    }

    const result = await superAdminService.updateOrganizationExpiry(id, expiry_date);
    res.json({ success: true, message: 'Organization expiry updated', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/organizations/:id
 * Delete organization
 */
router.delete('/organizations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const result = await superAdminService.deleteTenant(id);
    res.json({ success: true, message: 'Organization deleted successfully', data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/organizations/:id/impersonate
 * Impersonate organization admin
 */
router.post('/organizations/:id/impersonate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const result = await superAdminService.impersonateTenant(id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/organizations/:id/send-payment-link
 * Generate or send direct payment link to organization
 */
router.post('/organizations/:id/send-payment-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseTenantId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid organization ID' });
      return;
    }

    const profile = await getTenantProfile(id);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    // Determine recipient email
    const recipientEmail = (
      req.body.recipient_email ||
      profile.admin?.email ||
      profile.email ||
      ''
    ).trim();

    if (!recipientEmail) {
      res.status(400).json({
        success: false,
        message: 'No recipient email address specified or found for this organization.',
      });
      return;
    }

    // Build the direct public payment checkout URL
    const protocol = req.protocol || 'http';
    const originHeader = req.get('origin') || req.get('referer');
    let portStr = ':5173';
    if (originHeader) {
      try {
        const u = new URL(originHeader);
        if (u.port) portStr = `:${u.port}`;
      } catch (_) {}
    }
    const hostHeader = (req.get('host') || 'localhost:5173').toLowerCase().split(':')[0];
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    let baseDomain = hostHeader;
    if (hostHeader === 'dev.morsecrm.com' || hostHeader.endsWith('.dev.morsecrm.com')) {
      baseDomain = 'dev.morsecrm.com';
    } else if (hostHeader === 'staging.morsecrm.com' || hostHeader.endsWith('.staging.morsecrm.com')) {
      baseDomain = 'staging.morsecrm.com';
    } else {
      const parts = hostHeader.split('.');
      baseDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostHeader;
    }
    const paymentUrl = isLocal
      ? `http://${profile.slug}.localhost${portStr}/payment`
      : `https://${profile.slug}.${baseDomain}/payment`;

    const adminName = profile.admin?.name || 'Administrator';
    const customMessage = req.body.custom_message ? String(req.body.custom_message).trim() : '';

    const expiryDateVal = profile.settings?.subscription_expiry_date || null;
    const formattedExpiry = expiryDateVal
      ? new Date(expiryDateVal).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Active Trial';

    // Responsive HTML Email Template
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription & Payment Link for ${profile.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">CRM SaaS Platform</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #dbeafe;">Subscription Upgrade & Payment Checkout Link 💳</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin-top: 0; font-size: 16px; color: #0f172a;">
                Hello <strong>${adminName}</strong>,
              </p>
              <p style="color: #475569;">
                ${
                  customMessage
                    ? customMessage
                    : `Please find below your direct annual subscription payment link for <strong>${profile.name}</strong>. Choose a suitable tier, complete payment online via Razorpay, or view direct bank transfer details to keep your CRM workspace active.`
                }
              </p>

              <!-- Summary Card -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 22px; margin: 24px 0;">
                <h4 style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                  Organization Account Summary
                </h4>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #64748b; width: 140px;"><strong>Organization:</strong></td>
                    <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${profile.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;"><strong>Workspace:</strong></td>
                    <td style="padding: 5px 0; color: #2563eb; font-family: monospace; font-weight: 700;">${profile.slug}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;"><strong>Current Plan:</strong></td>
                    <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${profile.plan || 'Starter'} Plan</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #64748b;"><strong>Validity / Expiry:</strong></td>
                    <td style="padding: 5px 0; color: #0f172a;">${formattedExpiry}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 8px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
                      Complete Payment & Upgrade Plan &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback -->
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 20px;">
                Direct URL: <br/>
                <a href="${paymentUrl}" target="_blank" style="color: #2563eb; word-break: break-all; font-family: monospace;">${paymentUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} CRM Platform Solutions. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Attempt to dispatch real email via SMTP
    let emailSent = false;
    try {
      emailSent = await sendPlatformMail({
        to: recipientEmail,
        subject: `Subscription & Payment Link for ${profile.name}`,
        html: htmlEmail,
        text: `Hello ${adminName},\n\nPlease complete your subscription payment for ${profile.name} using the link below:\n${paymentUrl}\n\nRegards,\nCRM Platform Team`,
      });
    } catch (mailErr: any) {
      logger.error('[Admin] Error dispatching payment link email: ' + mailErr.message);
    }

    if (emailSent) {
      res.json({
        success: true,
        email_sent: true,
        message: `Payment link email dispatched successfully to ${recipientEmail}`,
        data: {
          organization_id: id,
          recipient: recipientEmail,
          paymentUrl,
          email_sent: true,
        },
      });
    } else {
      res.json({
        success: true,
        email_sent: false,
        message: `Payment link generated, but SMTP server is not configured or failed to dispatch email to ${recipientEmail}. You can copy and share the direct link below, or configure SMTP in Super Admin settings.`,
        data: {
          organization_id: id,
          recipient: recipientEmail,
          paymentUrl,
          email_sent: false,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/payments
 * Payments history filterable by org_id, search, status, date_from, date_to
 */
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { org_id, search, status, date_from, date_to } = req.query;
    let query = `
      SELECT 
        p.id,
        p.tenant_id as organization_id,
        t.name as organization_name,
        t.slug as organization_slug,
        p.pricing_tier_id as plan_id,
        COALESCE(pt.name, 'Starter Plan') as plan_name,
        (p.amount_cents::numeric / 100.0) as amount,
        p.currency,
        COALESCE(p.method, 'Razorpay') as payment_method,
        p.provider_order_id as razorpay_order_id,
        COALESCE(p.provider_payment_id, p.reference) as razorpay_payment_id,
        CASE 
          WHEN LOWER(p.status) IN ('paid', 'captured', 'success', 'completed') THEN 'Paid'
          WHEN LOWER(p.status) IN ('pending', 'processing', 'created') THEN 'Pending'
          WHEN LOWER(p.status) IN ('failed', 'cancelled') THEN 'Failed'
          ELSE p.status
        END as payment_status,
        s.starts_at as billing_start_date,
        s.ends_at as billing_end_date,
        p.created_at,
        p.notes,
        CONCAT('INV-', TO_CHAR(p.created_at, 'YYYY'), '-', LPAD(p.id::text, 5, '0')) as invoice_number
      FROM public.platform_payments p
      LEFT JOIN public.saas_tenants t ON t.id = p.tenant_id
      LEFT JOIN public.platform_pricing_tiers pt ON pt.id = p.pricing_tier_id
      LEFT JOIN public.platform_subscriptions s ON s.id = p.subscription_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (org_id) {
      const numericOrgId = Number(org_id);
      if (Number.isSafeInteger(numericOrgId)) {
        params.push(numericOrgId);
        query += ` AND p.tenant_id = $${params.length}`;
      }
    }

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      params.push(searchTerm);
      const idx = params.length;
      query += ` AND (
        t.name ILIKE $${idx} OR 
        t.slug ILIKE $${idx} OR 
        p.provider_payment_id ILIKE $${idx} OR 
        p.provider_order_id ILIKE $${idx} OR 
        p.reference ILIKE $${idx} OR 
        CONCAT('INV-', TO_CHAR(p.created_at, 'YYYY'), '-', LPAD(p.id::text, 5, '0')) ILIKE $${idx}
      )`;
    }

    if (status && status !== 'All') {
      const st = String(status).toLowerCase();
      if (st === 'paid') {
        query += ` AND LOWER(p.status) IN ('paid', 'captured', 'success', 'completed')`;
      } else if (st === 'pending') {
        query += ` AND LOWER(p.status) IN ('pending', 'processing', 'created')`;
      } else if (st === 'failed') {
        query += ` AND LOWER(p.status) IN ('failed', 'cancelled')`;
      } else {
        params.push(st);
        query += ` AND LOWER(p.status) = $${params.length}`;
      }
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND p.created_at >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND p.created_at <= $${params.length}::date + interval '1 day'`;
    }

    query += ` ORDER BY p.id DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/admin/payments/record
 * Record manual/cash/offline payment from Super Admin
 */
router.post('/payments/record', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      organization_id,
      plan_name = 'Starter',
      amount,
      discount_amount = 0,
      currency = 'INR',
      payment_method = 'Cash',
      reference,
      notes,
      paid_at,
    } = req.body;

    const orgId = Number(organization_id);
    if (!orgId) throw new ApiError(400, 'Organization ID is required');

    const orgRes = await pool.query(`SELECT id, name, slug, plan, status, settings FROM public.saas_tenants WHERE id = $1`, [orgId]);
    if (!orgRes.rows[0]) throw new ApiError(404, 'Organization not found');
    const org = orgRes.rows[0];

    // Find existing subscription
    const subCheck = await pool.query(
      `SELECT s.id, s.pricing_tier_id, s.status, s.ends_at, t.name AS tier_name
         FROM public.platform_subscriptions s
         LEFT JOIN public.platform_pricing_tiers t ON t.id = s.pricing_tier_id
        WHERE s.tenant_id = $1
        ORDER BY s.id DESC
        LIMIT 1`,
      [org.id]
    );
    const existingSub = subCheck.rows[0];
    const rawExpiry = existingSub?.ends_at || org.settings?.subscription_expiry_date;
    const existingExpiry = rawExpiry ? new Date(rawExpiry) : null;
    const hasActivePaidPlan = (org.status === 'active' || existingSub?.status === 'active' || existingSub?.status === 'paid')
      && (!existingExpiry || existingExpiry.getTime() > Date.now());

    const isUsd = String(currency).toUpperCase() === 'USD';

    const planRanks: Record<string, { rank: number; inr: number; usd: number; name: string }> = {
      starter: { rank: 1, inr: 9999, usd: 149, name: 'Starter' },
      growth: { rank: 2, inr: 19999, usd: 299, name: 'Growth' },
      business: { rank: 3, inr: 29999, usd: 449, name: 'Business' },
    };

    const currentPlanKey = String(org.plan || existingSub?.tier_name || 'starter').toLowerCase();
    const currentMeta = currentPlanKey.includes('business') ? planRanks.business : currentPlanKey.includes('growth') ? planRanks.growth : planRanks.starter;
    const targetPlanKey = String(plan_name).toLowerCase();
    const targetMeta = targetPlanKey.includes('business') ? planRanks.business : targetPlanKey.includes('growth') ? planRanks.growth : planRanks.starter;

    let isUpgrade = false;
    let basePayAmount = isUsd ? targetMeta.usd : targetMeta.inr;
    let targetExpiry: Date;

    if (hasActivePaidPlan) {
      if (targetMeta.rank < currentMeta.rank) {
        throw new ApiError(400, `Organization already has an active ${currentMeta.name} Plan. Downgrading to a lower package is not permitted during an active subscription.`);
      }
      if (targetMeta.rank > currentMeta.rank) {
        isUpgrade = true;
        const currentCredit = isUsd ? currentMeta.usd : currentMeta.inr;
        basePayAmount = Math.max(0, (isUsd ? targetMeta.usd : targetMeta.inr) - currentCredit);
      }
    }

    // NEXT RENEWAL date change ONLY if package has ended/expired!
    // Otherwise, expiry date remains exactly the same as with the old package.
    const isPackageEnded = !hasActivePaidPlan || !existingExpiry || existingExpiry.getTime() <= Date.now();
    if (!isPackageEnded && existingExpiry) {
      targetExpiry = existingExpiry;
    } else {
      const now = new Date();
      targetExpiry = new Date(now);
      targetExpiry.setFullYear(targetExpiry.getFullYear() + 1);
    }

    const grossAmount = Number(amount) !== undefined && Number(amount) > 0 ? Number(amount) : basePayAmount;
    const discountVal = Math.max(0, Number(discount_amount) || 0);
    const netAmount = Math.max(0, grossAmount - discountVal);
    const amountInSubunits = Math.round(netAmount * 100);

    // Resolve tier
    const tierRes = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM public.platform_pricing_tiers 
        WHERE active=TRUE 
          AND (LOWER(name) = LOWER($1) OR LOWER(name) LIKE $2)
        ORDER BY CASE WHEN LOWER(name) = LOWER($1) THEN 0 ELSE 1 END, id ASC 
        LIMIT 1`,
      [targetMeta.name, `%${targetMeta.name.toLowerCase()}%`]
    );
    const tierId = tierRes.rows[0]?.id ? Number(tierRes.rows[0].id) : null;

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
      [targetMeta.name, targetExpiry.toISOString(), org.id]
    );

    // 2. Update or Insert platform_subscriptions
    let subId: number | string;
    if (isUpgrade && existingSub?.id) {
      await pool.query(
        `UPDATE public.platform_subscriptions
            SET pricing_tier_id = $1,
                status = 'active',
                ends_at = $2,
                notes = $3,
                updated_at = NOW()
          WHERE id = $4`,
        [tierId, targetExpiry.toISOString(), `Upgraded to ${targetMeta.name} via ${payment_method}`, existingSub.id]
      );
      subId = existingSub.id;
    } else {
      const subRes = await pool.query(
        `INSERT INTO public.platform_subscriptions (
            tenant_id, pricing_tier_id, status, starts_at, ends_at, auto_renew, notes, created_at, updated_at
         ) VALUES ($1, $2, 'active', NOW(), $3, TRUE, $4, NOW(), NOW())
         RETURNING id`,
        [org.id, tierId, targetExpiry.toISOString(), `Payment recorded by admin via ${payment_method}`]
      );
      subId = subRes.rows[0]?.id;
    }

    // 3. Insert platform_payments
    const refStr = reference || `REC-${Date.now().toString().slice(-6)}`;
    const currSym = isUsd ? 'USD' : 'INR';
    const fullNotes = [
      `Payment recorded by admin for ${targetMeta.name} Plan (${payment_method}).`,
      isUpgrade ? `Upgrade from ${currentMeta.name}: Deducted current plan credit (-${currSym} ${isUsd ? currentMeta.usd : currentMeta.inr}). Expiry preserved: ${targetExpiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.` : '',
      discountVal > 0 ? `Discount: -${currSym} ${discountVal} (Gross: ${currSym} ${grossAmount}).` : '',
      notes || '',
    ].filter(Boolean).join(' ');

    const paymentRes = await pool.query(
      `INSERT INTO public.platform_payments
         (tenant_id, subscription_id, pricing_tier_id, amount_cents, currency, status, method, reference, notes, paid_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [
        org.id,
        subId,
        tierId,
        amountInSubunits,
        isUsd ? 'USD' : 'INR',
        payment_method.toLowerCase(),
        refStr,
        fullNotes,
        paid_at ? new Date(paid_at) : new Date(),
      ]
    );

    res.json({
      success: true,
      message: 'Payment successfully recorded and organization subscription updated.',
      data: {
        payment_id: paymentRes.rows[0]?.id,
        net_amount: netAmount,
        gross_amount: grossAmount,
        discount_amount: discountVal,
        organization_name: org.name,
        plan_name: targetMeta.name,
        is_upgrade: isUpgrade,
        subscription_expiry_date: targetExpiry.toISOString(),
        payment_method,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/webhooks
 * List webhook lifecycle logs
 */
router.get('/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT 
        id,
        event_id,
        event_type,
        gateway,
        organization_id,
        organization_name,
        amount,
        currency,
        invoice_number,
        payload,
        status,
        error_message,
        created_at,
        processed_at
      FROM public.platform_webhook_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search && String(search).trim()) {
      params.push(`%${String(search).trim()}%`);
      const idx = params.length;
      query += ` AND (
        event_id ILIKE $${idx} OR 
        organization_name ILIKE $${idx} OR 
        invoice_number ILIKE $${idx} OR 
        event_type ILIKE $${idx}
      )`;
    }

    query += ` ORDER BY id DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/webhooks/simulate
 * Simulates gateway webhook event lifecycle
 */
router.post('/webhooks/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      organization_id,
      event_type = 'payment.captured',
      plan_code = 'starter',
      amount = 9999,
      currency = 'INR'
    } = req.body;

    let targetOrgId = Number(organization_id) || null;
    let orgName = 'Demo Client Enterprise';
    let orgSlug = 'demo-client';

    if (targetOrgId) {
      const orgRes = await pool.query(`SELECT id, name, slug FROM public.saas_tenants WHERE id = $1`, [targetOrgId]);
      if (orgRes.rows.length > 0) {
        orgName = orgRes.rows[0].name;
        orgSlug = orgRes.rows[0].slug;
      }
    } else {
      const firstOrg = await pool.query(`SELECT id, name, slug FROM public.saas_tenants ORDER BY id ASC LIMIT 1`);
      if (firstOrg.rows.length > 0) {
        targetOrgId = Number(firstOrg.rows[0].id);
        orgName = firstOrg.rows[0].name;
        orgSlug = firstOrg.rows[0].slug;
      }
    }

    const simulatedEventId = `pay_sim_${Date.now()}`;
    const simulatedOrderId = `order_sim_${Date.now()}`;
    const simulatedInvoice = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const mockPayload = {
      entity: 'event',
      account_id: 'acc_crm_superadmin',
      event: event_type,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: simulatedEventId,
            order_id: simulatedOrderId,
            amount: Number(amount) * 100,
            currency: String(currency).toUpperCase(),
            status: event_type === 'payment.captured' ? 'captured' : 'failed',
            method: 'upi',
            captured: event_type === 'payment.captured',
            description: `Simulated Subscription for ${orgName}`,
            notes: {
              organization_id: targetOrgId,
              organization_slug: orgSlug,
              plan_code: plan_code,
              invoice_number: simulatedInvoice
            },
            created_at: Math.floor(Date.now() / 1000)
          }
        }
      }
    };

    const status = event_type === 'payment.captured' ? 'Success' : 'Failed';
    const errorMsg = event_type === 'payment.captured' ? null : 'Simulated payment authorization failed by user bank.';

    const insertRes = await pool.query(`
      INSERT INTO public.platform_webhook_logs (
        event_id, event_type, gateway, organization_id, organization_name,
        amount, currency, invoice_number, payload, status, error_message, processed_at
      ) VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      simulatedEventId,
      event_type,
      targetOrgId,
      orgName,
      amount,
      String(currency).toUpperCase(),
      simulatedInvoice,
      JSON.stringify(mockPayload),
      status,
      errorMsg
    ]);

    // If successful payment, also insert into platform_payments so transactions tab reflects it!
    if (event_type === 'payment.captured' && targetOrgId) {
      // Find tier id
      const tierRes = await pool.query(
        `SELECT id FROM public.platform_pricing_tiers WHERE LOWER(code) = LOWER($1) OR LOWER(name) LIKE LOWER($2) LIMIT 1`,
        [plan_code, `%${plan_code}%`]
      );
      const tierId = tierRes.rows[0]?.id || 1;

      await pool.query(`
        INSERT INTO public.platform_payments (
          tenant_id, pricing_tier_id, amount_cents, currency, status, method,
          provider_order_id, provider_payment_id, reference, notes, paid_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'paid', 'Razorpay Webhook', $5, $6, $7, $8, NOW(), NOW(), NOW())
      `, [
        targetOrgId,
        tierId,
        Math.round(Number(amount) * 100),
        String(currency).toUpperCase(),
        simulatedOrderId,
        simulatedEventId,
        simulatedInvoice,
        `Simulated Webhook Payment Receipt for ${orgName}`
      ]);
    }

    res.json({
      success: true,
      message: 'Simulated webhook processed successfully',
      data: insertRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/states
 * Country states for address forms
 */
router.get('/states', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, code, country_id FROM public.country_states ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
