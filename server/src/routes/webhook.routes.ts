import { Router } from 'express';
import { WebhookService } from '@/services/webhook.service';
import { saveWebhookSchema } from '@/schemas/webhook.schema';
import { ApiError } from '@/middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const webhooks = await WebhookService.getAll(search);
    res.json({ success: true, data: webhooks });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const webhook = await WebhookService.getById(String(req.params.id));
    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }
    res.json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const validated = saveWebhookSchema.parse(req.body);
    const webhook = await WebhookService.save(validated);
    res.status(201).json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const validated = saveWebhookSchema.parse(req.body);
    const webhook = await WebhookService.save(validated, String(req.params.id));
    res.json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await WebhookService.delete(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Webhook not found');
    }
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
