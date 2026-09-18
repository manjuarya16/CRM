import { Router } from 'express';
import { PipelineService } from '@/services/pipeline.service';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const pipelines = await PipelineService.getAll(search);
    res.json({ success: true, data: pipelines });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pipeline = await PipelineService.getById(String(req.params.id));
    if (!pipeline) {
      throw new ApiError(404, 'Pipeline not found');
    }
    res.json({ success: true, data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const pipeline = await PipelineService.save(req.body);
    res.status(201).json({ success: true, data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const pipeline = await PipelineService.save(req.body, String(req.params.id));
    res.json({ success: true, data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await PipelineService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Pipeline not found');
    }
    res.json({ success: true, message: 'Pipeline deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
