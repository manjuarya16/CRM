import { pool } from '@/config/db';
import { ILead } from '@/interfaces/lead.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class LeadService {
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const offset = (page - 1) * perPage;

      const countRes = await pool.query('SELECT COUNT(*) as count FROM leads');
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const { rows } = await pool.query(
        `SELECT l.*, p.name as person_name, ls.name as source_name, lst.name as stage_name
         FROM leads l
         LEFT JOIN persons p ON l.person_id = p.id
         LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
         LEFT JOIN lead_stages lst ON l.lead_stage_id = lst.id
         ORDER BY l.id DESC
         LIMIT $1 OFFSET $2`,
        [perPage, offset]
      );

      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'LeadService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<any | null> {
    try {
      const leadId = toNumberParam(id);
      if (!leadId) return null;

      const { rows } = await pool.query(
        `SELECT l.*, p.name as person_name, ls.name as source_name, lst.name as stage_name
         FROM leads l
         LEFT JOIN persons p ON l.person_id = p.id
         LEFT JOIN lead_sources ls ON l.lead_source_id = ls.id
         LEFT JOIN lead_stages lst ON l.lead_stage_id = lst.id
         WHERE l.id = $1`,
        [leadId]
      );
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'LeadService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
  public static async save(data: Partial<ILead>, id?: number | string): Promise<any> {
    try {
      const leadId = toNumberParam(id);
      const userId = toNumberParam(data.user_id);
      const personId = toNumberParam(data.person_id);
      const sourceId = toNumberParam(data.lead_source_id);
      const typeId = toNumberParam(data.lead_type_id);
      const pipelineId = toNumberParam(data.lead_pipeline_id);
      const stageId = toNumberParam(data.lead_pipeline_stage_id);

      if (leadId) {
        const existing = await this.getById(leadId);
        if (!existing) throw new ApiError(404, 'Lead not found');

        const { rows } = await pool.query(
          `UPDATE leads
           SET title = COALESCE($1, title),
               description = $2,
               lead_value = $3,
               status = $4,
               user_id = $5,
               person_id = $6,
               lead_source_id = $7,
               lead_type_id = $8,
               lead_pipeline_id = $9,
               lead_pipeline_stage_id = $10,
               updated_at = NOW()
           WHERE id = $11
           RETURNING *`,
          [
            data.title,
            data.description,
            data.lead_value,
            data.status,
            userId,
            personId,
            sourceId,
            typeId,
            pipelineId,
            stageId,
            leadId,
          ]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query(
          `INSERT INTO leads (title, description, lead_value, status, user_id, person_id, lead_source_id, lead_type_id, lead_pipeline_id, lead_pipeline_stage_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
           RETURNING *`,
          [
            data.title,
            data.description || null,
            data.lead_value || null,
            data.status ?? null,
            userId,
            personId,
            sourceId,
            typeId,
            pipelineId,
            stageId,
          ]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'LeadService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const leadId = toNumberParam(id);
      if (!leadId) return false;

      const result = await pool.query('DELETE FROM leads WHERE id = $1', [leadId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error({ error, id }, 'LeadService.delete failed');
      throw error;
    }
  }
}
