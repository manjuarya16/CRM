import { pool } from '@/config/db';
import { IEvent } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class EventService {
  public static async getAll(search?: string): Promise<IEvent[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_events($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'EventService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IEvent | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_event($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'EventService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: { name: string; description: string; date: string },
    id?: number | string
  ): Promise<IEvent> {
    try {
      const numId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_event($1, $2, $3::date, $4) as result',
        [data.name.trim(), data.description.trim(), data.date, numId]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'EventService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_event($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'EventService.delete failed');
      throw error;
    }
  }
}
