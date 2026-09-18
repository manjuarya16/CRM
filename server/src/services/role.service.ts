import { pool } from '@/config/db';
import { IRole } from '@/interfaces';
import { ApiError } from '@/middleware/errorHandler';

export class RoleService {
  public static async getAll(search?: string): Promise<IRole[]> {
    let query = `
      SELECT r.*, COALESCE(COUNT(u.id), 0)::int AS user_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE r.name ILIKE $${params.length} OR r.description ILIKE $${params.length}`;
    }

    query += `
      GROUP BY r.id
      ORDER BY r.id ASC
    `;

    const { rows } = await pool.query<IRole>(query, params);
    return rows;
  }

  public static async getById(id: number | string): Promise<IRole | null> {
    const { rows } = await pool.query<IRole>(
      `SELECT r.*, COALESCE(COUNT(u.id), 0)::int AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );
    return rows[0] || null;
  }

  // Unified single function for both Add and Edit
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
    const permType = data.permission_type || 'all';
    const permsJson = data.permissions ? JSON.stringify(data.permissions) : null;

    if (id) {
      // Edit / Update
      const existing = await this.getById(id);
      if (!existing) {
        throw new ApiError(404, 'Role not found');
      }

      const name = data.name !== undefined ? data.name : existing.name;
      const description = data.description !== undefined ? data.description : existing.description;
      const permissionType = data.permission_type !== undefined ? data.permission_type : existing.permission_type;

      const { rows } = await pool.query<IRole>(
        `UPDATE roles
         SET name = $1, description = $2, permission_type = $3, permissions = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name, description, permissionType, permsJson, id]
      );
      return rows[0];
    } else {
      // Add / Create
      const { rows } = await pool.query<IRole>(
        `INSERT INTO roles (name, description, permission_type, permissions, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [data.name, data.description || null, permType, permsJson, data.created_by || null]
      );
      return rows[0];
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    // Check if role is assigned to any user
    const usersRes = await pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = $1', [id]);
    const userCount = parseInt(usersRes.rows[0]?.count || '0', 10);
    if (userCount > 0) {
      throw new ApiError(400, `Cannot delete role because it is assigned to ${userCount} user(s).`);
    }

    const result = await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
