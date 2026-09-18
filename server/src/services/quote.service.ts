import { pool } from '@/config/db';
import { IQuote } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class QuoteService {
  public static async getAll(params: { page?: number; perPage?: number }): Promise<{ rows: any[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const offset = (page - 1) * perPage;

      const countRes = await pool.query('SELECT COUNT(*) as count FROM quotes');
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const { rows } = await pool.query(
        `SELECT q.*, u.name as sales_person_name, p.name as person_name 
         FROM quotes q 
         LEFT JOIN users u ON q.user_id = u.id 
         LEFT JOIN persons p ON q.person_id = p.id 
         ORDER BY q.id DESC 
         LIMIT $1 OFFSET $2`,
        [perPage, offset]
      );

      return { rows, total };
    } catch (error: any) {
      logger.error({ error, params }, 'QuoteService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<any | null> {
    try {
      const quoteId = toNumberParam(id);
      if (!quoteId) return null;

      const { rows } = await pool.query(
        `SELECT q.*, u.name as sales_person_name, p.name as person_name 
         FROM quotes q 
         LEFT JOIN users u ON q.user_id = u.id 
         LEFT JOIN persons p ON q.person_id = p.id 
         WHERE q.id = $1`,
        [quoteId]
      );
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error, id }, 'QuoteService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
  public static async save(data: Partial<IQuote>, id?: number | string): Promise<IQuote> {
    try {
      const quoteId = toNumberParam(id);
      const personId = toNumberParam(data.person_id);
      const userId = toNumberParam(data.user_id);
      const billingJson = typeof data.billing_address === 'object' ? JSON.stringify(data.billing_address) : data.billing_address;
      const shippingJson = typeof data.shipping_address === 'object' ? JSON.stringify(data.shipping_address) : data.shipping_address;

      if (quoteId) {
        const existing = await this.getById(quoteId);
        if (!existing) throw new ApiError(404, 'Quote not found');

        const { rows } = await pool.query<IQuote>(
          `UPDATE quotes
           SET subject = COALESCE($1, subject),
               description = $2,
               billing_address = $3,
               shipping_address = $4,
               discount_percent = $5,
               discount_amount = $6,
               tax_amount = $7,
               adjustment_amount = $8,
               sub_total = $9,
               grand_total = $10,
               person_id = $11,
               user_id = $12,
               updated_at = NOW()
           WHERE id = $13
           RETURNING *`,
          [
            data.subject,
            data.description,
            billingJson,
            shippingJson,
            data.discount_percent,
            data.discount_amount,
            data.tax_amount,
            data.adjustment_amount,
            data.sub_total,
            data.grand_total,
            personId,
            userId,
            quoteId,
          ]
        );
        return rows[0];
      } else {
        const { rows } = await pool.query<IQuote>(
          `INSERT INTO quotes (subject, description, billing_address, shipping_address, discount_percent, discount_amount, tax_amount, adjustment_amount, sub_total, grand_total, person_id, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
           RETURNING *`,
          [
            data.subject,
            data.description || null,
            billingJson || null,
            shippingJson || null,
            data.discount_percent || null,
            data.discount_amount || null,
            data.tax_amount || null,
            data.adjustment_amount || null,
            data.sub_total || null,
            data.grand_total || null,
            personId,
            userId,
          ]
        );
        return rows[0];
      }
    } catch (error: any) {
      logger.error({ error, data, id }, 'QuoteService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const quoteId = toNumberParam(id);
      if (!quoteId) return false;

      const result = await pool.query('DELETE FROM quotes WHERE id = $1', [quoteId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      logger.error({ error, id }, 'QuoteService.delete failed');
      throw error;
    }
  }
}
