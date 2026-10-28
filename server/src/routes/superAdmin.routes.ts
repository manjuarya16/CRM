import { Router } from 'express';
import { SuperAdminService } from '@/services/superAdmin.service';
import { requireSuperAdmin } from '@/middleware/superAdminAuth';
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
    const result = await SuperAdminService.login(email, password);
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
router.get('/tenants', requireSuperAdmin, async (_req, res, next) => {
  try {
    const tenants = await SuperAdminService.getTenants();
    res.json({ success: true, data: tenants });
  } catch (err) {
    next(err);
  }
});

// Protected: Create new Tenant Organization
router.post('/tenants', requireSuperAdmin, async (req, res, next) => {
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

    const result = await SuperAdminService.createTenant({
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
router.get('/tenants/:id', requireSuperAdmin, async (req, res, next) => {
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
router.put('/tenants/:id', requireSuperAdmin, async (req, res, next) => {
  try {
    const id = parseTenantId(req.params.id);
    if (id === null) {
      res.status(400).json({ success: false, message: 'Tenant ID must be a positive integer' });
      return;
    }
    const result = await SuperAdminService.updateTenant(id, req.body);
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
router.patch('/tenants/:id/status', requireSuperAdmin, async (req, res, next) => {
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

    const tenant = await SuperAdminService.updateTenantStatus(id, status);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// Protected: Dashboard Metrics
router.get('/metrics', requireSuperAdmin, async (_req, res, next) => {
  try {
    const metrics = await SuperAdminService.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

export default router;
