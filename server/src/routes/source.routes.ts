import { Router } from 'express';
import { SourceService } from '@/services/source.service';
import { sourceSchema } from '@/schemas/source.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sources = await SourceService.getAll(search);
    res.json({ success: true, data: sources });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const source = await SourceService.getById(String(req.params.id));
    if (!source) {
      throw new ApiError(404, 'Source not found');
    }
    res.json({ success: true, data: source });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = sourceSchema.parse(req.body);
    const source = await SourceService.save(validated);
    res.status(201).json({ success: true, data: source });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = sourceSchema.parse(req.body);
    const source = await SourceService.save(validated, String(req.params.id));
    res.json({ success: true, data: source });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await SourceService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Source not found');
    }
    res.json({ success: true, message: 'Source deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
