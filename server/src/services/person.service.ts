import { pool } from '@/config/db';
import { IPerson } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { PoolClient } from 'pg';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class PersonService {
  // DB Function call: get_all_persons(p_search, p_limit, p_offset)
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : null;
      const offset = (page - 1) * perPage;

      const { rows } = await client.query(
        'SELECT get_all_persons($1, $2, $3) as result',
        [search, perPage, offset]
      );
      const res = rows[0]?.result || { rows: [], total: 0 };
      return { rows: res.rows || [], total: Number(res.total) || 0 };
    } catch (error: any) {
      logger.error({ error, params }, 'PersonService.getAll failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: get_person(p_id)
  public static async getById(id: number | string): Promise<any | null> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);
      if (!personId) return null;

      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT get_person($1) as result',
        [personId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.getById failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // Unified DB Function call: save_person(...)
  public static async save(
    data: {
      name: string;
      emails?: any;
      contact_numbers?: any;
      organization_id?: number | null;
      job_title?: string | null;
      user_id?: number | null;
      custom_attributes?: Record<string, any>;
    },
    id?: number | string
  ): Promise<IPerson> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);
      const emailsJson = typeof data.emails === 'object' ? JSON.stringify(data.emails) : (data.emails || '[]');
      const contactsJson = typeof data.contact_numbers === 'object' ? JSON.stringify(data.contact_numbers) : (data.contact_numbers || '[]');
      const customAttrsJson = typeof data.custom_attributes === 'object' ? JSON.stringify(data.custom_attributes) : (data.custom_attributes || '{}');
      const orgId = toNumberParam(data.organization_id);
      const userId = toNumberParam(data.user_id);

      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb, $8) as result',
        [data.name.trim(), emailsJson, contactsJson, orgId, data.job_title || null, userId, customAttrsJson, personId]
      );

      if (!rows[0]?.result) {
        throw new ApiError(404, 'Person not found or save failed');
      }
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'PersonService.save failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: delete_person(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);
      if (!personId) return false;

      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT delete_person($1) as result',
        [personId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.delete failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: delete_all_persons()
  public static async deleteAll(): Promise<number> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT delete_all_persons() as result'
      );
      return Number(rows[0]?.result) || 0;
    } catch (error: any) {
      logger.error({ error }, 'PersonService.deleteAll failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}
