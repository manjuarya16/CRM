import { pool } from '@/config/db';
import { IUser, PublicUser, ICreateUserInput, toPublicUser } from '@/interfaces';
import { logger } from '@/utils/logger';
import bcrypt from 'bcrypt';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class UserService {
  // DB Function call: get_all_users(p_search, p_status, p_role_id)
  public static async getAll(params?: { search?: string; status?: boolean; roleId?: number }): Promise<any[]> {
    try {
      const search = params?.search?.trim() || null;
      const status = typeof params?.status === 'boolean' ? params.status : null;
      const roleId = toNumberParam(params?.roleId);

      const { rows } = await pool.query(
        'SELECT get_all_users($1, $2, $3) as result',
        [search, status, roleId]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, params }, 'UserService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_user(p_id)
  public static async getById(id: number | string): Promise<any | null> {
    try {
      const userId = toNumberParam(id);
      if (!userId) return null;

      const { rows } = await pool.query(
        'SELECT get_user($1) as result',
        [userId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'UserService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add & Edit: save_user(...)
  public static async save(
    data: {
      name: string;
      email: string;
      password?: string | null;
      status?: boolean;
      view_permission?: string;
      role_id?: number;
      group_ids?: number[] | null;
      image?: string | null;
    },
    id?: number | string
  ): Promise<any> {
    try {
      const userId = toNumberParam(id);
      let passwordHash: string | null = null;

      if (data.password && data.password.trim()) {
        passwordHash = await bcrypt.hash(data.password.trim(), 10);
      }

      const groupIds = Array.isArray(data.group_ids) ? data.group_ids : null;
      const status = typeof data.status === 'boolean' ? data.status : true;
      const viewPermission = data.view_permission || 'global';
      const roleId = toNumberParam(data.role_id) || 1;

      const { rows } = await pool.query(
        'SELECT save_user($1, $2, $3, $4, $5, $6, $7, $8, $9) as result',
        [
          data.name.trim(),
          data.email.trim().toLowerCase(),
          passwordHash,
          status,
          viewPermission,
          roleId,
          groupIds,
          data.image || null,
          userId,
        ]
      );

      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data: { ...data, password: '[REDACTED]' }, id }, 'UserService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_user(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const userId = toNumberParam(id);
      if (!userId) return false;

      const { rows } = await pool.query(
        'SELECT delete_user($1) as result',
        [userId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'UserService.delete failed');
      throw error;
    }
  }

  // Compatibility helpers for Auth & Passport
  public static async findByEmail(email: string): Promise<IUser | null> {
    try {
      const query = `
        SELECT u.*, r.name as role_name, r.permission_type, r.permissions 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1
      `;
      const { rows } = await pool.query<IUser>(query, [email.trim().toLowerCase()]);
      if (!rows[0]) return null;

      const user = rows[0];
      if (user.password && !user.password_hash) {
        user.password_hash = user.password;
      }
      return user;
    } catch (error: any) {
      logger.error({ error, email }, 'UserService.findByEmail failed');
      throw error;
    }
  }

  public static async findById(id: number | string): Promise<IUser | null> {
    try {
      const userId = toNumberParam(id);
      if (!userId) return null;

      const query = `
        SELECT u.*, r.name as role_name, r.permission_type, r.permissions 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
        LIMIT 1
      `;
      const { rows } = await pool.query<IUser>(query, [userId]);
      if (!rows[0]) return null;

      const user = rows[0];
      if (user.password && !user.password_hash) {
        user.password_hash = user.password;
      }
      return user;
    } catch (error: any) {
      logger.error({ error, id }, 'UserService.findById failed');
      throw error;
    }
  }

  public static async create(input: ICreateUserInput): Promise<IUser> {
    try {
      const roleId = toNumberParam(input.roleId) ?? 1;
      const result = await this.save({
        name: input.name,
        email: input.email,
        password: input.passwordHash,
        status: input.status,
        role_id: roleId,
      });
      return result;
    } catch (error: any) {
      logger.error({ error, input: { ...input, passwordHash: '[REDACTED]' } }, 'UserService.create failed');
      throw error;
    }
  }

  public static async findPaginated(params: { page?: number; perPage?: number; excludeRole?: number | string | null }): Promise<{ rows: PublicUser[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const offset = (page - 1) * perPage;
      const excludeRoleId = params.excludeRole !== null && params.excludeRole !== undefined ? Number(params.excludeRole) : null;

      const { rows } = await pool.query('SELECT fn_get_paginated_users($1, $2, $3, $4, $5, $6) as result', [
        null,
        null,
        null,
        excludeRoleId,
        perPage,
        offset,
      ]);

      const data = rows[0]?.result || { rows: [], total: 0 };
      return {
        rows: (data.rows || []).map(toPublicUser),
        total: Number(data.total) || 0,
      };
    } catch (error: any) {
      logger.error({ error, params }, 'UserService.findPaginated failed');
      throw error;
    }
  }

  public static async update(id: number | string, data: Partial<IUser>): Promise<PublicUser | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) return null;

      const name = data.name !== undefined ? data.name : existing.name;
      const email = data.email !== undefined ? data.email : existing.email;
      const status = data.status !== undefined ? data.status : existing.status;
      const roleId = data.role_id !== undefined ? data.role_id : existing.role_id;
      const viewPermission = data.view_permission !== undefined ? data.view_permission : existing.view_permission;

      const result = await this.save({
        name,
        email,
        status,
        role_id: roleId,
        view_permission: viewPermission,
      }, id);

      return result ? toPublicUser(result) : null;
    } catch (error: any) {
      logger.error({ error, id, data }, 'UserService.update failed');
      throw error;
    }
  }
}
