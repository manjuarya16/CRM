import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class TagService {
  public static async getAll(search?: string) {
    try {
      const result = await pool.query('SELECT get_all_tags($1) AS data', [search || null]);
      return result.rows[0]?.data || [];
    } catch (err) {
      logger.error({ err, search }, 'TagService.getAll failed');
      throw err;
    }
  }

  public static async getById(id: any) {
    const numId = toNumberParam(id);
    if (!numId) return null;
    try {
      const result = await pool.query('SELECT get_tag($1) AS data', [numId]);
      return result.rows[0]?.data || null;
    } catch (err) {
      logger.error({ err, id }, 'TagService.getById failed');
      throw err;
    }
  }

  public static async save(data: { name: string; color?: string }, id?: any) {
    const numId = toNumberParam(id);
    try {
      const result = await pool.query('SELECT save_tag($1, $2, $3) AS data', [
        data.name,
        data.color || '#0088cc',
        numId,
      ]);
      return result.rows[0]?.data || null;
    } catch (err) {
      logger.error({ err, data, id }, 'TagService.save failed');
      throw err;
    }
  }

  public static async delete(id: any) {
    const numId = toNumberParam(id);
    if (!numId) return false;
    try {
      const result = await pool.query('SELECT delete_tag($1) AS deleted', [numId]);
      return !!result.rows[0]?.deleted;
    } catch (err) {
      logger.error({ err, id }, 'TagService.delete failed');
      throw err;
    }
  }
}
