import { pool } from '@/config/db';
import { ICampaign } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class CampaignService {
  public static async getAll(search?: string): Promise<ICampaign[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_campaigns($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'CampaignService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<ICampaign | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_campaign($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'CampaignService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: {
      name: string;
      subject: string;
      status?: boolean;
      type: string;
      mail_to: string;
      spooling?: string | null;
      marketing_template_id?: number | null;
      marketing_event_id?: number | null;
    },
    id?: number | string
  ): Promise<ICampaign> {
    try {
      const numId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_campaign($1, $2, $3, $4, $5, $6, $7, $8, $9) as result',
        [
          data.name.trim(),
          data.subject.trim(),
          data.status ?? false,
          data.type,
          data.mail_to,
          data.spooling || null,
          data.marketing_template_id || null,
          data.marketing_event_id || null,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'CampaignService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_campaign($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'CampaignService.delete failed');
      throw error;
    }
  }
}
