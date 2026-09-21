import { Router } from 'express';
import { WorkflowService } from '@/services/workflow.service';
import { saveWorkflowSchema } from '@/schemas/workflow.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const workflows = await WorkflowService.getAll(search);
    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const workflow = await WorkflowService.getById(String(req.params.id));
    if (!workflow) {
      throw new ApiError(404, 'Workflow not found');
    }
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveWorkflowSchema.parse(req.body);
    const workflow = await WorkflowService.save(validated);
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveWorkflowSchema.parse(req.body);
    const workflow = await WorkflowService.save(validated, String(req.params.id));
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await WorkflowService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Workflow not found');
    }
    res.json({ success: true, message: 'Workflow deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
