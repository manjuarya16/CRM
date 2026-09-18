import { pool } from '@/config/db';
import { IType } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';

export class TypeService {
  public static async getAll(search?: string): Promise<IType[]> {
    let query = 'SELECT * FROM lead_types';
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE name ILIKE $${params.length}`;
    }

    query += ' ORDER BY id DESC';

    const { rows } = await pool.query<IType>(query, params);
    return rows;
  }

  public static async getById(id: number | string): Promise<IType | null> {
    const { rows } = await pool.query<IType>('SELECT * FROM lead_types WHERE id = $1', [id]);
    return rows[0] || null;
  }

  // Unified single function for both Add and Edit
  public static async save(data: { name: string }, id?: number | string): Promise<IType> {
    if (id) {
      // Edit / Update
      const existing = await this.getById(id);
      if (!existing) {
        throw new ApiError(404, 'Type not found');
      }

      const { rows } = await pool.query<IType>(
        `UPDATE lead_types
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [data.name, id]
      );
      return rows[0];
    } else {
      // Add / Create
      const { rows } = await pool.query<IType>(
        `INSERT INTO lead_types (name, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         RETURNING *`,
        [data.name]
      );
      return rows[0];
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    const result = await pool.query('DELETE FROM lead_types WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
