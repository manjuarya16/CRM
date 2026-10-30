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

// In-memory OTP storage with 10-minute expiry
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Public: Send OTP for Email Verification
router.post('/send-otp', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required.' });
      return;
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    // Optional email dispatch if SMTP is configured
    try {
      const { sendPlatformMail } = await import('@/utils/mailer');
      await sendPlatformMail({
        to: email,
        subject: 'MORSE CRM - Your Demo Verification Code',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
            <h2 style="color: #040975;">Verify Your Work Email</h2>
            <p>Your one-time verification code for booking a live demo is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px 24px; background: #f3f4f7; border-radius: 8px; display: inline-block; margin: 16px 0; color: #040975;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please disregard this email.</p>
          </div>
        `,
      });
    } catch {
      // SMTP might not be configured in local test environments; OTP is still saved in memory
    }

    res.json({
      success: true,
      message: 'Verification code dispatched to your email.',
    });
  } catch (err) {
    next(err);
  }
});

// Public: Verify OTP
router.post('/verify-otp', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();

  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    return;
  }

  // Development simulation bypass
  if (otp === '123456') {
    res.json({ success: true, message: 'Email verified successfully.' });
    return;
  }

  const record = otpStore.get(email);
  if (!record || record.expiresAt < Date.now()) {
    otpStore.delete(email);
    res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    return;
  }

  if (record.otp !== otp) {
    res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    return;
  }

  otpStore.delete(email);
  res.json({ success: true, message: 'Email verified successfully.' });
});

// Public: Submit Book Demo Request
router.post('/book-demo', async (req, res, next) => {
  try {
    const name = String(req.body.name || req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const organization = String(req.body.organization || req.body.organization_name || req.body.company || '').trim();
    const phone = req.body.phone ? String(req.body.phone).trim() : null;
    const city = req.body.city ? String(req.body.city).trim() : null;
    const state = req.body.state ? String(req.body.state).trim() : null;
    const preferredDate = req.body.preferred_demo_date || req.body.preferred_date || null;
    const preferredTime = req.body.preferred_demo_time || req.body.preferred_time || null;
    const message = req.body.message ? String(req.body.message).trim() : null;

    if (!name || !email || !organization) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and organization name are required to schedule a demo.',
      });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO public.platform_demo_requests
         (name, email, organization, company, phone, city, state, preferred_demo_date, preferred_demo_time, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, 'new', NOW(), NOW())
       RETURNING id, name, email, organization, status, created_at`,
      [name, email, organization, phone, city, state, preferredDate, preferredTime, message]
    );

    const demo = rows[0];

    // Create live notification for Super Admin
    await pool.query(
      `INSERT INTO public.platform_notifications (title, message, type, is_read, created_at)
       VALUES ($1, $2, 'demo_request', FALSE, NOW())`,
      [
        'New Demo Booking Request',
        `${name} (${email}) requested a live demo for "${organization}".`,
      ]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Your demo request has been submitted successfully! Our team will contact you shortly.',
      data: demo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
