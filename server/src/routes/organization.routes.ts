import { Router } from 'express';
import { OrganizationService } from '@/services/organization.service';
import { createOrganizationSchema, updateOrganizationSchema } from '@/schemas/organization.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/public/branding', async (_req, res, next) => {
  try {
    const branding = await OrganizationService.getPublicBranding();
    res.json({ success: true, data: branding });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;
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
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateOrganizationSchema.parse(req.body);
    const org = await OrganizationService.update(String(req.params.id), validated);
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
