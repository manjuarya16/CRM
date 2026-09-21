import { Router } from 'express';
import { EmailTemplateService } from '@/services/emailTemplate.service';
import { saveEmailTemplateSchema } from '@/schemas/emailTemplate.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const templates = await EmailTemplateService.getAll(search);
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplateService.getById(String(req.params.id));
    if (!template) {
      throw new ApiError(404, 'Email template not found');
    }
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveEmailTemplateSchema.parse(req.body);
    const template = await EmailTemplateService.save(validated);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveEmailTemplateSchema.parse(req.body);
    const template = await EmailTemplateService.save(validated, String(req.params.id));
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await EmailTemplateService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Email template not found');
    }
    res.json({ success: true, message: 'Email template deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
