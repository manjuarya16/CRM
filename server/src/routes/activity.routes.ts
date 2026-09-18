import { Router } from 'express';
import { ActivityService } from '@/services/activity.service';
import { activitySchema } from '@/schemas/activity.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const perPage = req.query.per_page ? Number(req.query.per_page) : 10;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await ActivityService.getAll({ page, perPage, search });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const activity = await ActivityService.getById(String(req.params.id));
    if (!activity) {
      throw new ApiError(404, 'Activity not found');
    }
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = activitySchema.parse(req.body);
    const activity = await ActivityService.save(validated);
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = activitySchema.parse(req.body);
    const activity = await ActivityService.save(validated, String(req.params.id));
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await ActivityService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Activity not found');
    }
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
