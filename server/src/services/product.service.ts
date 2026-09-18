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
      const offset = (page - 1) * perPage;

      let whereSql = 'WHERE 1=1';
      const queryParams: any[] = [];

      if (search) {
        queryParams.push(`%${search}%`);
        whereSql += ` AND (name ILIKE $${queryParams.length} OR sku ILIKE $${queryParams.length})`;
      }

      const countRes = await pool.query(`SELECT COUNT(*) as count FROM products ${whereSql}`, queryParams);
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      queryParams.push(perPage, offset);
      const { rows } = await pool.query<IProduct>(
        `SELECT * FROM products ${whereSql} ORDER BY id DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
        queryParams
      );

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

      const { rows } = await pool.query<IProduct>('SELECT * FROM products WHERE id = $1', [productId]);
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
        const existing = await this.getById(productId);
        if (!existing) throw new ApiError(404, 'Product not found');

        const { rows } = await pool.query<IProduct>(
          `UPDATE products
           SET sku = COALESCE($1, sku),
               name = COALESCE($2, name),
               description = $3,
               quantity = $4,
               price = $5,
               updated_at = NOW()
           WHERE id = $6
           RETURNING *`,
          [data.sku?.trim(), data.name?.trim(), data.description || null, quantity, price, productId]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query<IProduct>(
          `INSERT INTO products (sku, name, description, quantity, price, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [data.sku?.trim(), data.name?.trim() || null, data.description || null, quantity, price]
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

      const result = await pool.query('DELETE FROM products WHERE id = $1', [productId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error({ error, id }, 'ProductService.delete failed');
      throw error;
    }
  }
}
