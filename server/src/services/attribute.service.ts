import { pool } from '@/config/db';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class AttributeService {
  public static async getAll(search?: string, entity_type?: string, type?: string, quick_add?: boolean) {
    try {
      const result = await pool.query('SELECT get_all_attributes($1, $2, $3, $4) AS data', [
        search || null,
        entity_type || null,
        type || null,
        quick_add ?? null,
      ]);
      return result.rows[0]?.data || [];
    } catch (err) {
      logger.error({ err, search, entity_type, type, quick_add }, 'AttributeService.getAll failed');
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
        'SELECT save_attribute($1, $2, $3, $4, $5, $6::boolean, $7::boolean, $8, $9::integer, $10::jsonb, $11::integer, $12::boolean, $13::boolean) AS data',
        [
          data.code,
          data.name,
          data.type,
          data.entity_type,
          data.lookup_type || null,
          Boolean(data.is_required),
          Boolean(data.is_unique),
          data.validation || null,
          numId,
          optionsJson,
          Number(data.sort_order) || 0,
          Boolean(data.quick_add),
          data.is_user_defined !== undefined ? Boolean(data.is_user_defined) : true,
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
