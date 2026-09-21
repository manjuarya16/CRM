import { pool } from '@/config/db';
import { IPerson } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class PersonService {
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : '';
      const offset = (page - 1) * perPage;

      let whereSql = 'WHERE 1=1';
      const queryParams: any[] = [];

      if (search) {
        queryParams.push(`%${search}%`);
        whereSql += ` AND (p.name ILIKE $${queryParams.length} OR p.job_title ILIKE $${queryParams.length} OR o.name ILIKE $${queryParams.length} OR p.emails::text ILIKE $${queryParams.length})`;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) as count 
         FROM persons p 
         LEFT JOIN organizations o ON p.organization_id = o.id 
         ${whereSql}`,
        queryParams
      );
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      queryParams.push(perPage, offset);
      const { rows } = await pool.query(
        `SELECT p.*, o.name as organization_name, u.name as sales_owner_name
         FROM persons p
         LEFT JOIN organizations o ON p.organization_id = o.id
         LEFT JOIN users u ON p.user_id = u.id
         ${whereSql}
         ORDER BY p.id DESC
         LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
        queryParams
      );

      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'PersonService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<any | null> {
    try {
      const personId = toNumberParam(id);
      if (!personId) return null;

      const { rows } = await pool.query(
        `SELECT p.*, o.name as organization_name, u.name as sales_owner_name
         FROM persons p
         LEFT JOIN organizations o ON p.organization_id = o.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [personId]
      );

      if (!rows[0]) return null;

      const activitiesRes = await pool.query(
        `SELECT * FROM activities WHERE id IN (
           SELECT activity_id FROM activity_participants WHERE person_id = $1
         ) ORDER BY id DESC`,
        [personId]
      ).catch(() => ({ rows: [] }));

      const leadsRes = await pool.query(
        `SELECT * FROM leads WHERE person_id = $1 ORDER BY id DESC`,
        [personId]
      ).catch(() => ({ rows: [] }));

      return {
        ...rows[0],
        activities: activitiesRes.rows,
        leads: leadsRes.rows,
      };
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
  public static async save(
    data: {
      name: string;
      emails?: any;
      contact_numbers?: any;
      organization_id?: number | null;
      job_title?: string | null;
      user_id?: number | null;
    },
    id?: number | string
  ): Promise<IPerson> {
    try {
      const personId = toNumberParam(id);
      const emailsJson = typeof data.emails === 'object' ? JSON.stringify(data.emails) : (data.emails || '[]');
      const contactsJson = typeof data.contact_numbers === 'object' ? JSON.stringify(data.contact_numbers) : (data.contact_numbers || '[]');
      const orgId = toNumberParam(data.organization_id);
      const userId = toNumberParam(data.user_id);

      if (personId) {
        const existing = await pool.query('SELECT * FROM persons WHERE id = $1', [personId]);
        if (!existing.rows[0]) {
          throw new ApiError(404, 'Person not found');
        }

        const { rows } = await pool.query<IPerson>(
          `UPDATE persons
           SET name = $1, emails = $2, contact_numbers = $3, organization_id = $4, job_title = $5, user_id = $6, updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [data.name.trim(), emailsJson, contactsJson, orgId, data.job_title || null, userId, personId]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query<IPerson>(
          `INSERT INTO persons (name, emails, contact_numbers, organization_id, job_title, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
          [data.name.trim(), emailsJson, contactsJson, orgId, data.job_title || null, userId]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'PersonService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const personId = toNumberParam(id);
      if (!personId) return false;

      const result = await pool.query('DELETE FROM persons WHERE id = $1', [personId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.delete failed');
      throw error;
    }
  }
}
