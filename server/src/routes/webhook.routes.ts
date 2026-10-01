import { Router } from 'express';
import { WebhookService } from '@/services/webhook.service';
import { saveWebhookSchema } from '@/schemas/webhook.schema';
import { ApiError } from '@/middleware/errorHandler';
import { pool } from '@/config/db';
import { fireWebhook } from '@/utils/webhookRunner';

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

router.post('/:id/test', async (req, res, next) => {
  try {
    const webhook = await WebhookService.getById(String(req.params.id));
    if (!webhook) {
      throw new ApiError(404, 'Webhook not found');
    }

    // Fetch sample live CRM data for the matching entity
    let sampleData: any = {};
    if (webhook.entity_type === 'leads') {
      const { rows } = await pool.query('SELECT id, title, lead_value, status, person_id, user_id FROM leads ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 101, title: 'Sample Enterprise Software Deal', lead_value: 12000, status: 'Open' };
    } else if (webhook.entity_type === 'quotes') {
      const { rows } = await pool.query('SELECT id, subject, grand_total, sub_total, discount_amount, person_id FROM quotes ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 201, subject: 'Annual Licensing Proposal', grand_total: 9500, sub_total: 10000 };
    } else if (webhook.entity_type === 'persons') {
      const { rows } = await pool.query('SELECT id, name, emails, contact_numbers, job_title FROM persons ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 301, name: 'Komal Dhake', job_title: 'Sales Lead' };
    } else {
      sampleData = { id: 1, message: `Sample ${webhook.entity_type} event trigger`, timestamp: new Date().toISOString() };
    }

    const payload = webhook.payload_type === 'default'
      ? { ...sampleData, ...(typeof webhook.payload === 'object' ? webhook.payload : {}) }
      : (webhook.payload || sampleData);

    const result = await fireWebhook({
      method: webhook.method || 'POST',
      end_point: webhook.end_point,
      headers: webhook.headers || [],
      query_params: webhook.query_params || [],
      payload_type: webhook.payload_type || 'default',
      raw_payload_type: webhook.raw_payload_type || 'json',
      payload,
    });

    res.json({
      success: true,
      result,
      message: `Webhook fired successfully to ${webhook.end_point}`,
      sent_payload: payload,
    });
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
