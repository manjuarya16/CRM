import { pool } from '@/config/db';
import { IType } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class TypeService {
  // DB Function call: get_all_types(p_search)
  public static async getAll(search?: string): Promise<IType[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_types($1) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'TypeService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_type(p_id)
  public static async getById(id: number | string): Promise<IType | null> {
    try {
      const typeId = toNumberParam(id);
      if (!typeId) return null;

      const { rows } = await pool.query(
        'SELECT get_type($1) as result',
        [typeId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'TypeService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_type(p_name, p_id)
  public static async save(data: { name: string }, id?: number | string): Promise<IType> {
    try {
      const typeId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_type($1, $2) as result',
        [data.name.trim(), typeId]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'TypeService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_type(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const typeId = toNumberParam(id);
      if (!typeId) return false;

      const { rows } = await pool.query(
        'SELECT delete_type($1) as result',
        [typeId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'TypeService.delete failed');
      throw error;
    }
  }
}
