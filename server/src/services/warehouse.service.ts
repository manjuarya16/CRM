import { pool } from '@/config/db';
import { IWarehouse } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class WarehouseService {
  // DB Function call: get_all_warehouses(p_search)
  public static async getAll(search?: string): Promise<IWarehouse[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query(
        'SELECT get_all_warehouses($1::text) as result',
        [searchTerm]
      );
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'WarehouseService.getAll failed');
      throw error;
    }
  }

  // DB Function call: get_warehouse(p_id)
  public static async getById(id: number | string): Promise<IWarehouse | null> {
    try {
      const warehouseId = toNumberParam(id);
      if (!warehouseId) return null;

      const { rows } = await pool.query(
        'SELECT get_warehouse($1::integer) as result',
        [warehouseId]
      );
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'WarehouseService.getById failed');
      throw error;
    }
  }

  // Unified single DB Function call for Add and Edit: save_warehouse(...)
  public static async save(
    data: {
      name: string;
      description?: string | null;
      contact_name: string;
      contact_emails?: any;
      contact_numbers?: any;
      contact_address?: any;
      locations?: any[];
      custom_attributes?: Record<string, any>;
    },
    id?: number | string
  ): Promise<IWarehouse> {
    try {
      const warehouseId = toNumberParam(id);
      const emailsJson = JSON.stringify(data.contact_emails || []);
      const numbersJson = JSON.stringify(data.contact_numbers || []);
      const addressJson = JSON.stringify(data.contact_address || {});
      const locationsJson = data.locations ? JSON.stringify(data.locations) : null;
      const customAttrsJson = JSON.stringify(data.custom_attributes || {});

      const { rows } = await pool.query(
        'SELECT save_warehouse($1::varchar, $2::text, $3::varchar, $4::jsonb, $5::jsonb, $6::jsonb, $7::integer, $8::jsonb, $9::jsonb) as result',
        [
          data.name.trim(),
          data.description || null,
          data.contact_name.trim(),
          emailsJson,
          numbersJson,
          addressJson,
          warehouseId,
          locationsJson,
          customAttrsJson,
        ]
      );

      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'WarehouseService.save failed');
      throw error;
    }
  }

  // DB Function call: delete_warehouse(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    try {
      const warehouseId = toNumberParam(id);
      if (!warehouseId) return false;

      const { rows } = await pool.query(
        'SELECT delete_warehouse($1::integer) as result',
        [warehouseId]
      );
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'WarehouseService.delete failed');
      throw error;
    }
  }
}
