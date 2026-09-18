import { pool } from '@/config/db';
import { IUser, PublicUser, ICreateUserInput, toPublicUser } from '@/interfaces';

export class UserService {
  public static async findByEmail(email: string): Promise<IUser | null> {
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query<IUser>(query, [email.trim()]);
    if (!rows[0]) return null;

    const user = rows[0];
    if (user.password && !user.password_hash) {
      user.password_hash = user.password;
    }
    return user;
  }

  public static async findById(id: number | string): Promise<IUser | null> {
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query<IUser>(query, [id]);
    if (!rows[0]) return null;

    const user = rows[0];
    if (user.password && !user.password_hash) {
      user.password_hash = user.password;
    }
    return user;
  }

  public static async create(input: ICreateUserInput): Promise<IUser> {
    const roleId = input.roleId ?? 1;
    const { rows } = await pool.query<IUser>(
      `INSERT INTO users (name, email, password, role_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [input.name, input.email, input.passwordHash, roleId, input.status ?? true],
    );
    return rows[0];
  }

  public static async findPaginated(params: { page?: number; perPage?: number; excludeRole?: number | string | null }): Promise<{ rows: PublicUser[]; total: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const perPage = Math.max(1, Number(params.perPage) || 10);
    const offset = (page - 1) * perPage;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];

    if (params.excludeRole !== null && params.excludeRole !== undefined) {
      values.push(params.excludeRole);
      whereClause += ` AND u.role_id != $${values.length}`;
    }

    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    values.push(perPage, offset);
    const query = `
      SELECT u.id, u.name, u.email, u.status, u.view_permission, u.role_id, u.created_by, u.image, u.created_at, u.updated_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.id ASC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const { rows } = await pool.query<any>(query, values);
    return { rows: rows.map(toPublicUser), total };
  }

  public static async update(id: number | string, data: Partial<IUser>): Promise<PublicUser | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name : existing.name;
    const email = data.email !== undefined ? data.email : existing.email;
    const status = data.status !== undefined ? data.status : existing.status;
    const roleId = data.role_id !== undefined ? data.role_id : existing.role_id;
    const viewPermission = data.view_permission !== undefined ? data.view_permission : existing.view_permission;

    const { rows } = await pool.query<IUser>(
      `UPDATE users
       SET name = $1, email = $2, status = $3, role_id = $4, view_permission = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, email, status, roleId, viewPermission, id]
    );
    return rows[0] ? toPublicUser(rows[0]) : null;
  }

  public static async delete(id: number | string): Promise<boolean> {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  public static async getNextId(): Promise<number> {
    const { rows } = await pool.query<{ next_id: string }>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users'
    );
    return parseInt(rows[0]?.next_id || '1', 10);
  }

  public static toPublic(user: IUser): PublicUser {
    return toPublicUser(user);
  }
}
