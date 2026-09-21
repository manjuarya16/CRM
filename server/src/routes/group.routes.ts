import { Router } from 'express';
import { GroupService } from '@/services/group.service';
import { groupSchema } from '@/schemas/group.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const groups = await GroupService.getAll(search);
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const group = await GroupService.getById(String(req.params.id));
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = groupSchema.parse(req.body);
    const group = await GroupService.save(validated);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = groupSchema.parse(req.body);
    const group = await GroupService.save(validated, String(req.params.id));
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await GroupService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Group not found');
    }
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
