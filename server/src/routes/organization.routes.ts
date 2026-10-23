import { Router } from 'express';
import { OrganizationService } from '@/services/organization.service';
import { createOrganizationSchema, updateOrganizationSchema } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';
import { processWorkflowsForEvent } from '@/services/workflowEngine';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getTenantProfile } from '@/routes/tenant.routes';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'organizations');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `org-logo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/public/branding', async (_req, res, next) => {
  try {
    const branding = await OrganizationService.getPublicBranding();
    res.json({ success: true, data: branding });
  } catch (err) {
    next(err);
  }
});

// Company Profile endpoints
router.get(['/profile', '/current'], async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).tenant?.id || 1;
    const profile = await getTenantProfile(tenantId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

router.put(['/profile', '/current'], async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).tenant?.id || 1;
    const updated = await OrganizationService.updateCompanyProfile(req.body, (req as any).user);
    const profile = await getTenantProfile(tenantId);
    res.json({ success: true, data: profile || updated, message: 'Organization profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/logo', upload.single('logo'), async (req, res, next) => {
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

router.get('/', async (req, res, next) => {
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

router.get('/:id', async (req, res, next) => {
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

router.post('/', async (req, res, next) => {
  try {
    const validated = createOrganizationSchema.parse(req.body);
    const org = await OrganizationService.create(validated);
    if (org?.id) {
      processWorkflowsForEvent('organizations', 'created', org.id, (req as any).user).catch(() => {});
    }
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
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

router.delete('/:id', async (req, res, next) => {
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
