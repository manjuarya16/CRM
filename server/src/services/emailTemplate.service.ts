import { pool } from '@/config/db';
import { IEmailTemplate } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class EmailTemplateService {
  public static async getAll(search?: string): Promise<IEmailTemplate[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_email_templates($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'EmailTemplateService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IEmailTemplate | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_email_template($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'EmailTemplateService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: { name: string; subject: string; content: string },
    id?: number | string
  ): Promise<IEmailTemplate> {
    try {
      const numId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_email_template($1, $2, $3, $4) as result',
        [data.name.trim(), data.subject.trim(), data.content, numId]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'EmailTemplateService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_email_template($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'EmailTemplateService.delete failed');
      throw error;
    }
  }
}
