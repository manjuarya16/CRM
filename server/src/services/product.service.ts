import { pool } from '@/config/db';
import { IProduct } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class ProductService {
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: IProduct[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : '';

      const { rows } = await pool.query('SELECT * FROM public.fn_get_all_products($1, $2, $3)', [
        search,
        page,
        perPage,
      ]);
      const total = rows.length > 0 ? Number(rows[0].total_count || rows.length) : 0;
      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'ProductService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IProduct | null> {
    try {
      const productId = toNumberParam(id);
      if (!productId) return null;

      const { rows } = await pool.query('SELECT * FROM public.fn_get_product_by_id($1)', [productId]);
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'ProductService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
  public static async save(data: Partial<IProduct>, id?: number | string): Promise<IProduct> {
    try {
      const productId = toNumberParam(id);
      const quantity = Number.isFinite(data.quantity) ? Number(data.quantity) : 0;
      const price = data.price !== undefined && data.price !== null ? Number(data.price) : null;

      if (productId) {
        const { rows } = await pool.query(
          'SELECT * FROM public.fn_update_product($1, $2, $3, $4, $5, $6)',
          [productId, data.sku?.trim() || null, data.name?.trim() || null, data.description || null, quantity, price]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query(
          'SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)',
          [data.sku?.trim() || null, data.name?.trim() || null, data.description || null, quantity, price]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'ProductService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const productId = toNumberParam(id);
      if (!productId) return false;

      const { rows } = await pool.query('SELECT public.fn_delete_product($1) AS deleted', [productId]);
      return Boolean(rows[0]?.deleted);
    } catch (error: any) {
      logger.error({ error, id }, 'ProductService.delete failed');
      throw error;
    }
  }
}
