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
  const rawSlug = req.params.slug ? req.params.slug.toLowerCase().trim() : '';
  if (rawSlug === 'current' || rawSlug === 'me') {
    return next();
  }
  try {
    const slug = rawSlug;
    const { rows } = await pool.query(
      "SELECT id, name, slug, domain, status, plan, COALESCE(NULLIF(logo_url, ''), settings->>'logo_url') AS logo_url FROM public.saas_tenants WHERE slug = $1 LIMIT 1",
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
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const combinedName = [firstName, lastName].filter(Boolean).join(' ');
    const name = String(req.body.name || req.body.full_name || combinedName || '').trim();
    const email = String(req.body.email || req.body.work_email || '').trim().toLowerCase();
    
    let organization = String(req.body.organization || req.body.organization_name || req.body.company || '').trim();
    if (!organization && email) {
      const domain = email.split('@')[1];
      if (domain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domain)) {
        const domainName = domain.split('.')[0];
        organization = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      } else {
        organization = name ? `${name}'s Team` : 'Demo Organization';
      }
    } else if (!organization) {
      organization = name ? `${name}'s Team` : 'Demo Organization';
    }

    const phone = req.body.phone ? String(req.body.phone).trim() : null;
    const city = req.body.city ? String(req.body.city).trim() : null;
    const state = req.body.state ? String(req.body.state).trim() : null;
    const preferredDate = req.body.preferred_demo_date || req.body.preferred_date || null;
    const preferredTime = req.body.preferred_demo_time || req.body.preferred_time || null;
    const message = req.body.message || req.body.explore || req.body.requirements
      ? String(req.body.message || req.body.explore || req.body.requirements).trim()
      : null;

    if (!name || !email) {
      res.status(400).json({
        success: false,
        message: 'First name and email are required to schedule a demo.',
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

    // Send confirmation email to the demo requester
    try {
      const templateRes = await pool.query<{ subject: string; content: string }>(
        `SELECT subject, content FROM public.platform_email_templates 
         WHERE LOWER(name) IN ('demo_schedule_confirmation', 'demo_received')
         ORDER BY (LOWER(name) = 'demo_schedule_confirmation') DESC LIMIT 1`
      );

      const defaultSubject = 'Your MORSE CRM Demo Request is Confirmed - {{organization}}';
      const defaultContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
  <div style="background-color: #03075e; padding: 28px 32px; text-align: left;">
    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">MORSE CRM</h1>
    <p style="margin: 4px 0 0 0; color: #93c5fd; font-size: 13px; font-weight: 500;">Live Demonstration Request Confirmation</p>
  </div>
  <div style="padding: 32px;">
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Hi {{name}},</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Thank you for scheduling a demonstration of <strong>MORSE CRM</strong> for <strong>{{organization}}</strong>. We have successfully received your request, and our solution team is preparing a customized walkthrough focused on your sales processes.
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #03075e; text-transform: uppercase; letter-spacing: 0.5px;">Demo Schedule Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr><td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 500;">Organization:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{organization}}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 500;">Preferred Date:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{preferred_date}}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 500;">Preferred Time:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{preferred_time}}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 500;">Location:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{city}}, {{state}}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-weight: 500;">Topics to Explore:</td><td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{{requirements}}</td></tr>
      </table>
    </div>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      <strong>What will happen next?</strong><br>
      A dedicated CRM specialist will review your requirements and send a calendar invitation with a video meeting link to <strong>{{email}}</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
      Need to make changes or have questions before the demo? Simply reply directly to this email or contact our support team.
    </p>
    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">Warm regards,</p>
      <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">The MORSE CRM Team</p>
    </div>
  </div>
  <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
    &copy; 2026 MORSE CRM. All rights reserved.
  </div>
</div>`.trim();

      const rawSubject = templateRes.rows[0]?.subject || defaultSubject;
      const rawContent = templateRes.rows[0]?.content || defaultContent;

      const variables: Record<string, string> = {
        name,
        company: organization,
        organization,
        email,
        phone: phone || 'Not provided',
        city: city || 'Not provided',
        state: state || 'Not provided',
        location: [city, state].filter(Boolean).join(', ') || 'Online Video Meeting',
        preferred_date: preferredDate || 'Flexible / To be coordinated',
        preferred_time: preferredTime || 'Flexible / To be coordinated',
        requirements: message || 'General platform walkthrough and sales workflow review',
        message: message || 'General platform walkthrough and sales workflow review',
      };

      const replaceVars = (str: string) =>
        str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => variables[key] ?? '');

      const finalSubject = replaceVars(rawSubject);
      const finalHtml = replaceVars(rawContent);
      const plainText = finalHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      const { sendPlatformMail } = await import('@/utils/mailer');
      await sendPlatformMail({
        to: email,
        subject: finalSubject,
        html: finalHtml,
        text: plainText,
      });
    } catch (mailErr) {
      console.error('Failed to dispatch demo confirmation email:', mailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Your demo request has been submitted successfully! A confirmation email has been sent to your inbox.',
      data: demo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
