import { pool } from '@/config/db';
import { ILead } from '@/interfaces/lead.interface';
import { logger } from '@/utils/logger';
import { PoolClient } from 'pg';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class LeadService {
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : '';

      const { rows } = await client.query(
        "SELECT * FROM public.fn_get_all_leads($1, $2, $3)",
        [search, page, perPage]
      );
      const total = rows.length > 0 ? Number(rows[0].total_count || rows.length) : 0;
      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'LeadService.getAll failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  public static async getById(id: number | string): Promise<any | null> {
    let client: PoolClient | undefined;
    try {
      const leadId = toNumberParam(id);
      if (!leadId) return null;

      client = await pool.connect();
      const { rows } = await client.query(
        "SELECT * FROM public.fn_get_lead_by_id($1)",
        [leadId]
      );
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'LeadService.getById failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  public static async save(data: Partial<ILead>, id?: number | string): Promise<any> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const leadId = toNumberParam(id);
      const userId = toNumberParam(data.user_id);
      const personId = toNumberParam(data.person_id);
      const sourceId = toNumberParam(data.lead_source_id);
      const typeId = toNumberParam(data.lead_type_id);
      const pipelineId = toNumberParam(data.lead_pipeline_id);
      const stageId = toNumberParam(data.lead_pipeline_stage_id);

      if (leadId) {
        const { rows } = await client.query(
          "SELECT * FROM public.fn_update_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
          [
            leadId,
            data.title || null,
            data.description || null,
            data.lead_value || null,
            data.status ?? null,
            null,
            userId,
            personId,
            sourceId,
            typeId,
            pipelineId,
            stageId,
            data.expected_close_date || null,
          ]
        );
        return rows[0];
      } else {
        const { rows } = await client.query(
          "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [
            data.title || '',
            data.description || null,
            data.lead_value || null,
            userId,
            personId,
            sourceId,
            typeId,
            pipelineId,
            data.expected_close_date || null,
          ]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'LeadService.save failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    let client: PoolClient | undefined;
    try {
      const leadId = toNumberParam(id);
      if (!leadId) return false;

      client = await pool.connect();
      const { rows } = await client.query(
        "SELECT public.fn_delete_lead($1) AS deleted",
        [leadId]
      );
      return Boolean(rows[0]?.deleted);
    } catch (error: any) {
      logger.error({ error, id }, 'LeadService.delete failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}
