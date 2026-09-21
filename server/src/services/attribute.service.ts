import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class AttributeService {
  public static async getAll(search?: string, entity_type?: string, type?: string) {
    try {
      const result = await pool.query('SELECT get_all_attributes($1, $2, $3) AS data', [
        search || null,
        entity_type || null,
        type || null,
      ]);
      return result.rows[0]?.data || [];
    } catch (err) {
      logger.error({ err, search, entity_type, type }, 'AttributeService.getAll failed');
      throw err;
    }
  }

  public static async getById(id: any) {
    const numId = toNumberParam(id);
    if (!numId) return null;
    try {
      const result = await pool.query('SELECT get_attribute($1) AS data', [numId]);
      return result.rows[0]?.data || null;
    } catch (err) {
      logger.error({ err, id }, 'AttributeService.getById failed');
      throw err;
    }
  }

  public static async save(data: any, id?: any) {
    const numId = toNumberParam(id);
    try {
      const optionsJson = data.options ? JSON.stringify(data.options) : '[]';
      const result = await pool.query(
        'SELECT save_attribute($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13) AS data',
        [
          data.code,
          data.name,
          data.type,
          data.entity_type,
          data.lookup_type || null,
          data.is_required ?? false,
          data.is_unique ?? false,
          data.validation || null,
          numId,
          optionsJson,
          data.sort_order ?? 0,
          data.quick_add ?? false,
          data.is_user_defined ?? true,
        ]
      );
      return result.rows[0]?.data || null;
    } catch (err) {
      logger.error({ err, data, id }, 'AttributeService.save failed');
      throw err;
    }
  }

  public static async delete(id: any) {
    const numId = toNumberParam(id);
    if (!numId) return false;
    try {
      const result = await pool.query('SELECT delete_attribute($1) AS deleted', [numId]);
      return !!result.rows[0]?.deleted;
    } catch (err) {
      logger.error({ err, id }, 'AttributeService.delete failed');
      throw err;
    }
  }
}
