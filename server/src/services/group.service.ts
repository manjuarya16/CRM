import { pool } from '@/config/db';
import { IGroup } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class GroupService {
  // DB Function call: get_all_groups(p_search)
  public static async getAll(search?: string): Promise<IGroup[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_groups($1) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'GroupService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_group(p_id)
  public static async getById(id: number | string): Promise<IGroup | null> {
    try {
      const groupId = toNumberParam(id);
      if (!groupId) return null;

      const { rows } = await pool.query(
        'SELECT get_group($1) as result',
        [groupId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'GroupService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_group(p_name, p_description, p_id, p_user_ids)
  public static async save(
    data: { name: string; description?: string | null; user_ids?: number[] | null },
    id?: number | string
  ): Promise<IGroup> {
    try {
      const groupId = toNumberParam(id);
      const userIds = Array.isArray(data.user_ids) ? data.user_ids : null;

      const { rows } = await pool.query(
        'SELECT save_group($1, $2, $3, $4) as result',
        [data.name.trim(), data.description || null, groupId, userIds]
      );

      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'GroupService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_group(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const groupId = toNumberParam(id);
      if (!groupId) return false;

      const { rows } = await pool.query(
        'SELECT delete_group($1) as result',
        [groupId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'GroupService.delete failed');
      throw error;
    }
  }
}
