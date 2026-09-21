import { pool } from '@/config/db';
import { IRole } from '@/interfaces';
import { logger } from '@/utils/logger';
import { CRM_PERMISSION_GROUPS, ALL_CRM_PERMISSION_KEYS } from '@/constants/permissions';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class RoleService {
  // Return CRM system permissions tree
  public static getPermissionsTree() {
    return {
      groups: CRM_PERMISSION_GROUPS,
      all_keys: ALL_CRM_PERMISSION_KEYS,
    };
  }

  // DB Function call: get_all_roles(p_search)
  public static async getAll(search?: string): Promise<IRole[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_roles($1) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'RoleService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_role(p_id)
  public static async getById(id: number | string): Promise<IRole | null> {
    try {
      const roleId = toNumberParam(id);
      if (!roleId) return null;

      const { rows } = await pool.query(
        'SELECT get_role($1) as result',
        [roleId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'RoleService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_role(...)
  public static async save(
    data: {
      name: string;
      description?: string | null;
      permission_type?: string;
      permissions?: any;
      created_by?: number | null;
    },
    id?: number | string
  ): Promise<IRole> {
    try {
      const roleId = toNumberParam(id);
      const permType = data.permission_type || 'all';
      const permsJson = data.permissions ? JSON.stringify(data.permissions) : null;
      const createdBy = toNumberParam(data.created_by);

      const { rows } = await pool.query(
        'SELECT save_role($1, $2, $3, $4::jsonb, $5, $6) as result',
        [data.name.trim(), data.description || null, permType, permsJson, createdBy, roleId]
      );

      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'RoleService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_role(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const roleId = toNumberParam(id);
      if (!roleId) return false;

      const { rows } = await pool.query(
        'SELECT delete_role($1) as result',
        [roleId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'RoleService.delete failed');
      throw error;
    }
  }
}
