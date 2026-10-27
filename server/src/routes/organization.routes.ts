import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import { OrganizationService } from '@/services/organization.service';
import { createOrganizationSchema, updateOrganizationSchema } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';
import { processWorkflowsForEvent } from '@/services/workflowEngine';
import { requireAuth } from '@/middleware/auth';
import { getTenantProfile } from '@/routes/tenant.routes';
import { pool } from '@/config/db';

const router = Router();

const orgUploadDir = path.join(process.cwd(), 'uploads', 'organizations');
if (!fs.existsSync(orgUploadDir)) {
  fs.mkdirSync(orgUploadDir, { recursive: true });
}
const orgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, orgUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `org-logo-${uniqueSuffix}${ext}`);
  },
});
const uploadOrgLogo = multer({
  storage: orgStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post('/logo', requireAuth, uploadOrgLogo.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload a logo file');
    }
    const relativeUrl = `/uploads/organizations/${req.file.filename}`;
    res.json({ success: true, logo_url: relativeUrl });
  } catch (err) {
    next(err);
  }
});

router.get('/public/branding', async (_req, res, next) => {
  try {
    const branding = await OrganizationService.getPublicBranding();
    res.json({ success: true, data: branding });
  } catch (err) {
    next(err);
  }
});

// Profile endpoints for the logged-in tenant organization
router.get(['/current', '/profile', '/company-profile'], requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || (req as any).user?.tenant_id;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'No tenant context found' });
      return;
    }
    const profile = await getTenantProfile(tenantId);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Tenant organization not found' });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

router.put(['/current', '/profile', '/company-profile'], requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || (req as any).user?.tenant_id;
    if (!tenantId) {
      res.status(400).json({ success: false, message: 'No tenant context found' });
      return;
    }
    const {
      name,
      logo_url,
      domain,
      email,
      phone,
      website,
      registration_no,
      established_date,
      address,
      currency,
      timezone,
    } = req.body;

    const existingRes = await pool.query(
      'SELECT settings, logo_url, name FROM public.saas_tenants WHERE id = $1',
      [tenantId]
    );

    if (existingRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Tenant organization not found' });
      return;
    }

    const currentSettings = existingRes.rows[0].settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(registration_no !== undefined ? { registration_no } : {}),
      ...(established_date !== undefined ? { established_date } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(address !== undefined ? { address: { ...(currentSettings.address || {}), ...address } } : {}),
      ...(logo_url !== undefined ? { logo_url } : {}),
    };

    const finalName = name && typeof name === 'string' && name.trim() ? name.trim() : existingRes.rows[0].name;
    const finalLogo = logo_url !== undefined ? logo_url : existingRes.rows[0].logo_url;

    await pool.query(
      `UPDATE public.saas_tenants 
       SET name = $1, 
           logo_url = $2, 
           domain = COALESCE($3, domain), 
           settings = $4::jsonb, 
           updated_at = NOW() 
       WHERE id = $5`,
      [finalName, finalLogo, domain || null, JSON.stringify(updatedSettings), tenantId]
    );

    const updatedProfile = await getTenantProfile(tenantId);
    res.json({
      success: true,
      message: 'Organization details updated successfully',
      data: updatedProfile,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limitParam = req.query.per_page || req.query.limit;
    const perPage = limitParam ? Number(limitParam) : 200;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await OrganizationService.getAll({ page, perPage, search });
    res.json({ success: true, data: result.rows, rows: result.rows, total: result.total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const org = await OrganizationService.getById(String(req.params.id));
    if (!org) {
      throw new ApiError(404, 'Organization not found');
    }
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const validated = createOrganizationSchema.parse(req.body);
    if (!validated.user_id && (req as any).user?.id) {
      validated.user_id = Number((req as any).user.id);
    }
    const org = await OrganizationService.create(validated);
    if (org?.id) {
      processWorkflowsForEvent('organizations', 'created', org.id, (req as any).user).catch(() => {});
    }
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const validated = updateOrganizationSchema.parse(req.body);
    const org = await OrganizationService.update(String(req.params.id), validated);
    if (org?.id) {
      processWorkflowsForEvent('organizations', 'updated', org.id, (req as any).user).catch(() => {});
    }
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await OrganizationService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Organization not found');
    }
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
