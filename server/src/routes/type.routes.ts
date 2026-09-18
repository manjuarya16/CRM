import { Router } from 'express';
import { TypeService } from '@/services/type.service';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const types = await TypeService.getAll(search);
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const type = await TypeService.getById(String(req.params.id));
    if (!type) {
      throw new ApiError(404, 'Type not found');
    }
    res.json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const type = await TypeService.save(req.body);
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const type = await TypeService.save(req.body, String(req.params.id));
    res.json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await TypeService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Type not found');
    }
    res.json({ success: true, message: 'Type deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
