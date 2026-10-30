import { Router } from 'express';
import { superAdminService } from '@/services/superAdmin.service';
import { requireSuperAdmin, requireSuperAdminPermission } from '@/middleware/superAdminAuth';
import { getTenantProfile } from '@/routes/tenant.routes';

const router = Router();

const parseTenantId = (value: string | string[]): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Public: Super Admin Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }
    const result = await superAdminService.login(email, password);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Protected: Super Admin Profile
router.get('/me', requireSuperAdmin, (req, res) => {
  res.json({ success: true, superAdmin: (req as any).superAdmin });
});

// Protected: List all Tenants
router.get('/tenants', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.view', 'platform.domains.view'), async (_req, res, next) => {
  try {
    const tenants = await superAdminService.getTenants();
    res.json({ success: true, data: tenants });
  } catch (err) {
    next(err);
  }
});

// Protected: Create new Tenant Organization
router.post('/tenants', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.create'), async (req, res, next) => {
  try {
    const {
      name,
      slug,
      plan,
      admin_name,
      admin_email,
      admin_password,
      registration_no,
      email,
      phone,
      website,
      established_date,
      currency,
      timezone,
      logo_url,
      street,
      city,
      state,
      country,
      pincode,
      address,
    } = req.body;

    if (!name || !slug || !admin_name || !admin_email || !admin_password) {
      res.status(400).json({
        success: false,
        message: 'name, slug, admin_name, admin_email, and admin_password are all required',
      });
      return;
    }

    const result = await superAdminService.createTenant({
      name,
      slug,
      plan,
      admin_name,
      admin_email,
      admin_password,
      registration_no,
      email,
      phone,
      website,
      established_date,
      currency,
      timezone,
      logo_url,
      street,
      city,
      state,
      country,
      pincode,
      address,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Protected: Get single Tenant Organization full details
router.get('/tenants/:id', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.view'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const profile = await getTenantProfile(id);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Tenant organization not found' });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// Protected: Update existing Tenant Organization
router.put('/tenants/:id', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.edit'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const result = await superAdminService.updateTenant(id, req.body);
    const updatedProfile = await getTenantProfile(id);
    res.json({
      success: true,
      message: 'Organization updated successfully',
      tenant: result,
      data: updatedProfile,
    });
  } catch (err) {
    next(err);
  }
});

// Protected: Update Tenant Status (activate/suspend)
router.patch('/tenants/:id/status', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.edit', 'platform.domains.edit'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const { status } = req.body;
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

// Protected: Impersonate Organization Admin
router.post('/tenants/:id/impersonate', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.view'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const result = await superAdminService.impersonateTenant(id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Protected: Update Organization Expiry Date
router.patch('/tenants/:id/expiry', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.edit'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
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

// Protected: Delete Organization
router.delete('/tenants/:id', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.delete'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const result = await superAdminService.deleteTenant(id);
    res.json({ success: true, message: 'Organization deleted successfully', data: result });
  } catch (err) {
    next(err);
  }
});

// Protected: Trigger Expiry Reminders
router.post('/tenants/trigger-expiry-reminders', requireSuperAdmin, requireSuperAdminPermission('platform.organizations.edit'), async (_req, res, next) => {
  try {
    const result = await superAdminService.triggerExpiryReminders();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Protected: Live Sidebar Counts
router.get('/sidebar-counts', requireSuperAdmin, async (_req, res, next) => {
  try {
    const counts = await superAdminService.getSidebarCounts();
    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
});

// Protected: Super Admin Record Offline Payment
router.post('/payments/record-offline', requireSuperAdmin, requireSuperAdminPermission('platform.payments.create'), async (req, res, next) => {
  try {
    const { tenant_id, pricing_tier_id, amount_cents, currency, method, reference, notes } = req.body;
    if (!tenant_id || !pricing_tier_id || !amount_cents) {
      res.status(400).json({ success: false, message: 'tenant_id, pricing_tier_id, and amount_cents are required' });
      return;
    }
    const { platformPaymentService } = await import('@/services/platformPayment.service');
    const result = await platformPaymentService.recordOfflinePayment({
      tenantId: Number(tenant_id),
      pricingTierId: Number(pricing_tier_id),
      amountCents: Number(amount_cents),
      currency,
      method,
      reference,
      notes,
    });
    res.status(201).json({ success: true, message: 'Offline payment recorded successfully', data: result });
  } catch (err) {
    next(err);
  }
});

// Protected: Super Admin Create Razorpay Order
router.post('/subscriptions/create-order', requireSuperAdmin, requireSuperAdminPermission('platform.payments.create'), async (req, res, next) => {
  try {
    const { tenant_id, pricing_tier_id, amount_cents, currency } = req.body;
    if (!tenant_id || !pricing_tier_id) {
      res.status(400).json({ success: false, message: 'tenant_id and pricing_tier_id are required' });
      return;
    }
    const { platformPaymentService } = await import('@/services/platformPayment.service');
    const orderData = await platformPaymentService.createOrder({
      tenantId: Number(tenant_id),
      pricingTierId: Number(pricing_tier_id),
      amountCents: amount_cents ? Number(amount_cents) : undefined,
      currency,
      notes: { created_by: 'super_admin' },
    });
    res.json({ success: true, data: orderData });
  } catch (err) {
    next(err);
  }
});

// Protected: Super Admin Verify Razorpay Payment
router.post('/subscriptions/verify-payment', requireSuperAdmin, requireSuperAdminPermission('platform.payments.create'), async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { platformPaymentService } = await import('@/services/platformPayment.service');
    const payment = await platformPaymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    res.json({ success: true, message: 'Payment verified and subscription activated', data: payment });
  } catch (err) {
    next(err);
  }
});

// Protected: Impersonate Platform / Tenant User
router.post('/users/:id/impersonate', requireSuperAdmin, requireSuperAdminPermission('platform.users.view'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'User ID must be a positive integer' });
      return;
    }
    const result = await superAdminService.impersonateUser(id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Protected: Change User Password
router.put('/users/:id/change-password', requireSuperAdmin, requireSuperAdminPermission('platform.users.edit'), async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'User ID must be a positive integer' });
      return;
    }
    const { password } = req.body;
    const result = await superAdminService.changeUserPassword(id, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Protected: Country States for address forms
router.get('/states', requireSuperAdmin, async (_req, res, next) => {
  try {
    const { pool } = await import('@/config/db');
    const { rows } = await pool.query(
      `SELECT id, name, code, country_id FROM public.country_states ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
