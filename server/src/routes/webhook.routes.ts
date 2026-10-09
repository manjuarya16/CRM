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

    function replacePlaceholdersSimple(str: string, ctx: Record<string, string>): string {
      if (!str) return str;
      return str.replace(/(\{\{|\{%\s*)([a-zA-Z0-9_.]+)(\}\}|\s*%\})/g, (_, _open, key) => ctx[key] ?? '');
    }

    const entityCtx: Record<string, string> = {};
    if (sampleData && typeof sampleData === 'object') {
      for (const [k, v] of Object.entries(sampleData)) {
        if (v !== null && v !== undefined && typeof v !== 'object') {
          entityCtx[k] = String(v);
        }
      }
    }

    let payload: any;
    if (webhook.payload_type === 'raw') {
      const rawStr = typeof webhook.payload === 'string'
        ? webhook.payload
        : (webhook.payload ? JSON.stringify(webhook.payload, null, 2) : '');
      const resolved = replacePlaceholdersSimple(rawStr, entityCtx);
      try {
        payload = JSON.parse(resolved);
      } catch {
        payload = resolved;
      }
    } else if (webhook.payload_type === 'default') {
      const baseObj = typeof webhook.payload === 'object' && webhook.payload ? webhook.payload : {};
      payload = { ...entityCtx, ...baseObj };
    } else {
      payload = webhook.payload || sampleData;
    }

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

router.post('/test-direct', async (req, res, next) => {
  try {
    const { method, end_point, headers, query_params, payload_type, raw_payload_type, payload, entity_type } = req.body;

    if (!end_point || typeof end_point !== 'string' || !end_point.startsWith('http')) {
      throw new ApiError(400, 'Valid Target Endpoint URL starting with http:// or https:// is required');
    }

    let sampleData: any = {};
    const eType = entity_type || 'leads';
    if (eType === 'leads') {
      const { rows } = await pool.query('SELECT id, title, lead_value, status, person_id, user_id FROM leads ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 101, title: 'Sample Enterprise Software Deal', lead_value: 12000, status: 'Open' };
    } else if (eType === 'quotes') {
      const { rows } = await pool.query('SELECT id, subject, grand_total, sub_total, discount_amount, person_id FROM quotes ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 201, subject: 'Annual Licensing Proposal', grand_total: 9500, sub_total: 10000 };
    } else if (eType === 'persons') {
      const { rows } = await pool.query('SELECT id, name, emails, contact_numbers, job_title FROM persons ORDER BY id DESC LIMIT 1');
      sampleData = rows[0] || { id: 301, name: 'Komal Dhake', job_title: 'Sales Lead' };
    } else {
      sampleData = { id: 1, message: `Sample ${eType} event trigger`, timestamp: new Date().toISOString() };
    }

    function replacePlaceholdersSimple(str: string, ctx: Record<string, string>): string {
      if (!str) return str;
      return str.replace(/(\{\{|\{%\s*)([a-zA-Z0-9_.]+)(\}\}|\s*%\})/g, (_, _open, key) => ctx[key] ?? '');
    }

    const entityCtx: Record<string, string> = {};
    if (sampleData && typeof sampleData === 'object') {
      for (const [k, v] of Object.entries(sampleData)) {
        if (v !== null && v !== undefined && typeof v !== 'object') {
          entityCtx[k] = String(v);
        }
      }
    }

    let finalPayload: any;
    if (payload_type === 'raw') {
      const rawStr = typeof payload === 'string'
        ? payload
        : (payload ? JSON.stringify(payload, null, 2) : '');
      const resolved = replacePlaceholdersSimple(rawStr, entityCtx);
      try {
        finalPayload = JSON.parse(resolved);
      } catch {
        finalPayload = resolved;
      }
    } else if (payload_type === 'default') {
      const baseObj = typeof payload === 'object' && payload ? payload : {};
      finalPayload = { ...entityCtx, ...baseObj };
    } else {
      finalPayload = payload || sampleData;
    }

    const result = await fireWebhook({
      method: method || 'POST',
      end_point,
      headers: headers || [],
      query_params: query_params || [],
      payload_type: payload_type || 'default',
      raw_payload_type: raw_payload_type || 'json',
      payload: finalPayload,
    });

    res.json({
      success: true,
      result,
      message: `Webhook fired successfully to ${end_point}`,
      sent_payload: finalPayload,
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
