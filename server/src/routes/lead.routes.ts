import { Router } from 'express';
import { LeadService } from '@/services/lead.service';
import { leadSchema } from '@/schemas/lead.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await LeadService.getAll({ page, perPage, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await LeadService.getById(String(req.params.id));
    if (!lead) {
      throw new ApiError(404, 'Lead not found');
    }
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = leadSchema.parse(req.body);
    const lead = await LeadService.save(validated);
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = leadSchema.parse(req.body);
    const lead = await LeadService.save(validated, String(req.params.id));
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await LeadService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Lead not found');
    }
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
