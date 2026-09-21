import { pool } from '@/config/db';
import { ISource } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class SourceService {
  // DB Function call: get_all_sources(p_search)
  public static async getAll(search?: string): Promise<ISource[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_sources($1) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'SourceService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_source(p_id)
  public static async getById(id: number | string): Promise<ISource | null> {
    try {
      const sourceId = toNumberParam(id);
      if (!sourceId) return null;

      const { rows } = await pool.query(
        'SELECT get_source($1) as result',
        [sourceId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'SourceService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_source(p_name, p_id)
  public static async save(data: { name: string }, id?: number | string): Promise<ISource> {
    try {
      const sourceId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_source($1, $2) as result',
        [data.name.trim(), sourceId]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'SourceService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_source(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const sourceId = toNumberParam(id);
      if (!sourceId) return false;

      const { rows } = await pool.query(
        'SELECT delete_source($1) as result',
        [sourceId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'SourceService.delete failed');
      throw error;
    }
  }
}
