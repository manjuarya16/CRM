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
      const warehouses: IWarehouse[] = rows[0]?.result || [];

      // Attach locations and product_count to each warehouse
      if (warehouses.length > 0) {
        const ids = warehouses.map((w: any) => w.id);

        // DB Function call: get_warehouse_locations(p_warehouse_ids)
        const locRes = await pool.query(
          'SELECT get_warehouse_locations($1::int[]) as result',
          [ids]
        ).catch(async () => {
          return pool.query(
            'SELECT id, warehouse_id, name, created_at FROM warehouse_locations WHERE warehouse_id = ANY($1::int[]) ORDER BY id ASC',
            [ids]
          );
        });

        const locationsList = Array.isArray(locRes.rows[0]?.result)
          ? locRes.rows[0].result
          : locRes.rows;

        const locMap: Record<number, any[]> = {};
        for (const loc of locationsList) {
          const wId = Number(loc.warehouse_id);
          if (!locMap[wId]) locMap[wId] = [];
          locMap[wId].push({
            id: loc.id,
            name: loc.name,
            created_at: loc.created_at,
          });
        }

        const countRes = await pool.query(
          `SELECT warehouse_id, COUNT(DISTINCT product_id)::int AS product_count
           FROM product_inventories
           WHERE warehouse_id = ANY($1::int[])
           GROUP BY warehouse_id`,
          [ids]
        );
        const countMap: Record<number, number> = {};
        for (const r of countRes.rows) {
          countMap[r.warehouse_id] = r.product_count;
        }

        for (const w of warehouses as any[]) {
          w.locations = locMap[w.id] || w.locations || [];
          w.product_count = countMap[w.id] ?? 0;
        }
      }

      return warehouses;
    } catch (error: any) {
      logger.error({ error, search }, 'WarehouseService.getAll failed');
      throw error;
    }
  }

  // Get all products linked to a warehouse via product_inventories
  public static async getProductsByWarehouse(warehouseId: number): Promise<any[]> {
    try {
      const { rows } = await pool.query(
        `SELECT p.id, p.sku, p.name, p.description, p.price, p.quantity,
                pi.in_stock, pi.allocated,
                wl.name AS warehouse_location_name
         FROM product_inventories pi
         JOIN products p ON p.id = pi.product_id
         LEFT JOIN warehouse_locations wl ON wl.id = pi.warehouse_location_id
         WHERE pi.warehouse_id = $1
         ORDER BY p.name ASC`,
        [warehouseId]
      );
      return rows;
    } catch (error: any) {
      logger.error({ error, warehouseId }, 'WarehouseService.getProductsByWarehouse failed');
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
