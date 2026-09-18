import { pool } from '@/config/db';
import { IPipeline } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class PipelineService {
  // DB Function call: get_all_pipelines(p_search)
  public static async getAll(search?: string): Promise<IPipeline[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_pipelines($1) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'PipelineService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_pipeline(p_id)
  public static async getById(id: number | string): Promise<IPipeline | null> {
    try {
      const pipelineId = toNumberParam(id);
      if (!pipelineId) return null;

      const { rows } = await pool.query(
        'SELECT get_pipeline($1) as result',
        [pipelineId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'PipelineService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_pipeline(...)
  public static async save(
    data: {
      name: string;
      is_default?: boolean;
      rotten_days?: number;
      stages?: Array<{ id?: number; code?: string | null; name: string; probability?: number; sort_order?: number }>;
    },
    id?: number | string
  ): Promise<IPipeline> {
    try {
      const pipelineId = toNumberParam(id);
      const isDefault = Boolean(data.is_default);
      const rottenDays = Number.isFinite(data.rotten_days) ? Number(data.rotten_days) : 30;
      const stagesJson = data.stages ? JSON.stringify(data.stages) : '[]';

      const { rows } = await pool.query(
        'SELECT save_pipeline($1, $2, $3, $4::jsonb, $5) as result',
        [data.name.trim(), rottenDays, isDefault, stagesJson, pipelineId]
      );

      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'PipelineService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_pipeline(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const pipelineId = toNumberParam(id);
      if (!pipelineId) return false;

      const { rows } = await pool.query(
        'SELECT delete_pipeline($1) as result',
        [pipelineId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'PipelineService.delete failed');
      throw error;
    }
  }
}
