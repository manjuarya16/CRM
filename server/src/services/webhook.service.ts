import { pool } from '@/config/db';
import { IWebhook } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class WebhookService {
  public static async getAll(search?: string): Promise<IWebhook[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_webhooks($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'WebhookService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IWebhook | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_webhook($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'WebhookService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: {
      name: string;
      entity_type: string;
      description?: string | null;
      method: string;
      end_point: string;
      query_params?: any;
      headers?: any;
      payload_type?: string;
      raw_payload_type?: string;
      payload?: any;
    },
    id?: number | string
  ): Promise<IWebhook> {
    try {
      const numId = toNumberParam(id);
      const queryParamsJson = JSON.stringify(data.query_params || []);
      const headersJson = JSON.stringify(data.headers || []);
      const payloadJson = data.payload ? JSON.stringify(data.payload) : null;

      const { rows } = await pool.query(
        'SELECT save_webhook($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11) as result',
        [
          data.name.trim(),
          data.entity_type,
          data.description || null,
          data.method.toUpperCase(),
          data.end_point.trim(),
          queryParamsJson,
          headersJson,
          data.payload_type || 'default',
          data.raw_payload_type || 'json',
          payloadJson,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'WebhookService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_webhook($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'WebhookService.delete failed');
      throw error;
    }
  }
}
