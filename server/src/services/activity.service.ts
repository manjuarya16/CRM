import { pool } from '@/config/db';
import { IActivity } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class ActivityService {
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: IActivity[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const offset = (page - 1) * perPage;

      const countRes = await pool.query('SELECT COUNT(*) as count FROM activities');
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const { rows } = await pool.query<IActivity>(
        'SELECT * FROM activities ORDER BY id DESC LIMIT $1 OFFSET $2',
        [perPage, offset]
      );

      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'ActivityService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IActivity | null> {
    try {
      const activityId = toNumberParam(id);
      if (!activityId) return null;

      const { rows } = await pool.query<IActivity>('SELECT * FROM activities WHERE id = $1', [activityId]);
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'ActivityService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
  public static async save(data: Partial<IActivity>, id?: number | string): Promise<IActivity> {
    try {
      const activityId = toNumberParam(id);
      const userId = toNumberParam(data.user_id);
      const isDone = Boolean(data.is_done);

      if (activityId) {
        const existing = await this.getById(activityId);
        if (!existing) throw new ApiError(404, 'Activity not found');

        const { rows } = await pool.query<IActivity>(
          `UPDATE activities
           SET title = COALESCE($1, title),
               type = COALESCE($2, type),
               comment = $3,
               schedule_from = $4,
               schedule_to = $5,
               is_done = $6,
               user_id = $7,
               location = $8,
               updated_at = NOW()
           WHERE id = $9
           RETURNING *`,
          [
            data.title?.trim(),
            data.type?.trim(),
            data.comment || null,
            data.schedule_from || null,
            data.schedule_to || null,
            isDone,
            userId,
            data.location || null,
            activityId,
          ]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query<IActivity>(
          `INSERT INTO activities (title, type, comment, schedule_from, schedule_to, is_done, user_id, location, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING *`,
          [
            data.title?.trim() || null,
            data.type?.trim() || 'call',
            data.comment || null,
            data.schedule_from || null,
            data.schedule_to || null,
            isDone,
            userId,
            data.location || null,
          ]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'ActivityService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const activityId = toNumberParam(id);
      if (!activityId) return false;

      const result = await pool.query('DELETE FROM activities WHERE id = $1', [activityId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error({ error, id }, 'ActivityService.delete failed');
      throw error;
    }
  }
}
