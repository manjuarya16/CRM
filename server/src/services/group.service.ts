import { pool } from '@/config/db';
import { IGroup } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';

export class GroupService {
  public static async getAll(search?: string): Promise<IGroup[]> {
    let query = `
      SELECT g.*, COALESCE(COUNT(ug.user_id), 0)::int AS user_count
      FROM groups g
      LEFT JOIN user_groups ug ON ug.group_id = g.id
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE g.name ILIKE $${params.length} OR g.description ILIKE $${params.length}`;
    }

    query += `
      GROUP BY g.id
      ORDER BY g.id DESC
    `;

    const { rows } = await pool.query<IGroup>(query, params);
    return rows;
  }

  public static async getById(id: number | string): Promise<IGroup | null> {
    const { rows } = await pool.query<IGroup>(
      `SELECT g.*, COALESCE(COUNT(ug.user_id), 0)::int AS user_count
       FROM groups g
       LEFT JOIN user_groups ug ON ug.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id`,
      [id]
    );

    if (!rows[0]) return null;

    const usersRes = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       INNER JOIN user_groups ug ON ug.user_id = u.id
       WHERE ug.group_id = $1`,
      [id]
    );

    rows[0].users = usersRes.rows;
    return rows[0];
  }

  // Unified single function for both Add and Edit
  public static async save(
    data: { name: string; description?: string | null; user_ids?: number[] },
    id?: number | string
  ): Promise<IGroup> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let group: IGroup;

      if (id) {
        // Edit / Update
        const existing = await client.query('SELECT * FROM groups WHERE id = $1', [id]);
        if (!existing.rows[0]) {
          throw new ApiError(404, 'Group not found');
        }

        const name = data.name !== undefined ? data.name : existing.rows[0].name;
        const description = data.description !== undefined ? data.description : existing.rows[0].description;

        const updateRes = await client.query<IGroup>(
          `UPDATE groups
           SET name = $1, description = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [name, description, id]
        );
        group = updateRes.rows[0];
      } else {
        // Add / Create
        const insertRes = await client.query<IGroup>(
          `INSERT INTO groups (name, description, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING *`,
          [data.name, data.description || null]
        );
        group = insertRes.rows[0];
      }

      // Sync users if provided
      if (Array.isArray(data.user_ids)) {
        await client.query('DELETE FROM user_groups WHERE group_id = $1', [group.id]);
        for (const userId of data.user_ids) {
          await client.query(
            'INSERT INTO user_groups (group_id, user_id) VALUES ($1, $2)',
            [group.id, userId]
          );
        }
      }

      await client.query('COMMIT');
      return group;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    const result = await pool.query('DELETE FROM groups WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
