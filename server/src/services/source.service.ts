import { pool } from '@/config/db';
import { ISource } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';

export class SourceService {
  public static async getAll(search?: string): Promise<ISource[]> {
    let query = 'SELECT * FROM lead_sources';
    const params: any[] = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE name ILIKE $${params.length}`;
    }

    query += ' ORDER BY id DESC';

    const { rows } = await pool.query<ISource>(query, params);
    return rows;
  }

  public static async getById(id: number | string): Promise<ISource | null> {
    const { rows } = await pool.query<ISource>('SELECT * FROM lead_sources WHERE id = $1', [id]);
    return rows[0] || null;
  }

  // Unified single function for both Add and Edit
  public static async save(data: { name: string }, id?: number | string): Promise<ISource> {
    if (id) {
      // Edit / Update
      const existing = await this.getById(id);
      if (!existing) {
        throw new ApiError(404, 'Source not found');
      }

      const { rows } = await pool.query<ISource>(
        `UPDATE lead_sources
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [data.name, id]
      );
      return rows[0];
    } else {
      // Add / Create
      const { rows } = await pool.query<ISource>(
        `INSERT INTO lead_sources (name, created_at, updated_at)
         VALUES ($1, NOW(), NOW())
         RETURNING *`,
        [data.name]
      );
      return rows[0];
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    const result = await pool.query('DELETE FROM lead_sources WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
