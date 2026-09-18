import { pool } from '@/config/db';
import { IWorkflow } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class WorkflowService {
  public static async getAll(search?: string): Promise<IWorkflow[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_workflows($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'WorkflowService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IWorkflow | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_workflow($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'WorkflowService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: {
      name: string;
      description?: string | null;
      entity_type: string;
      event: string;
      condition_type: string;
      conditions?: any;
      actions?: any;
    },
    id?: number | string
  ): Promise<IWorkflow> {
    try {
      const numId = toNumberParam(id);
      const conditionsJson = JSON.stringify(data.conditions || []);
      const actionsJson = JSON.stringify(data.actions || []);

      const { rows } = await pool.query(
        'SELECT save_workflow($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8) as result',
        [
          data.name.trim(),
          data.description || null,
          data.entity_type,
          data.event,
          data.condition_type,
          conditionsJson,
          actionsJson,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'WorkflowService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_workflow($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'WorkflowService.delete failed');
      throw error;
    }
  }
}
