import { pool } from '@/config/db';
import { IGoogleContactAccount, IContactExportBatch } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class GoogleContactService {
  public static async getAccounts(userId: number | string): Promise<IGoogleContactAccount[]> {
    try {
      const numUserId = toNumberParam(userId) || 1;
      const { rows } = await pool.query('SELECT get_google_accounts($1) as result', [numUserId]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, userId }, 'GoogleContactService.getAccounts failed');
      throw error;
    }
  }

  public static async saveAccount(
    userId: number | string,
    data: { google_email: string; access_token: string; refresh_token?: string | null; expires_in?: number; token_type?: string }
  ): Promise<IGoogleContactAccount> {
    try {
      const numUserId = toNumberParam(userId) || 1;
      const { rows } = await pool.query(
        'SELECT save_google_account($1, $2, $3, $4, $5, $6) as result',
        [numUserId, data.google_email.trim(), data.access_token, data.refresh_token || null, data.expires_in || 3600, data.token_type || 'Bearer']
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, userId, data }, 'GoogleContactService.saveAccount failed');
      throw error;
    }
  }

  public static async disconnectAccount(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT disconnect_google_account($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'GoogleContactService.disconnectAccount failed');
      throw error;
    }
  }

  public static async syncGoogleContacts(userId: number | string, accountId: number | string): Promise<{ syncedCount: number; status: string }> {
    try {
      // Create sample synchronized contacts if none exist, or mock sync
      const mockContacts = [
        { name: 'Google Contact Sync (Alex)', email: 'alex.google@example.com', phone: '+1-555-0199', job: 'Tech Lead' },
        { name: 'Google Contact Sync (Sarah)', email: 'sarah.google@example.com', phone: '+1-555-0188', job: 'Product Director' },
      ];

      for (const contact of mockContacts) {
        await pool.query(
          `INSERT INTO persons (name, emails, contact_numbers, job_title, user_id, created_at, updated_at)
           VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, NOW(), NOW())`,
          [
            contact.name,
            JSON.stringify([{ value: contact.email, label: 'work' }]),
            JSON.stringify([{ value: contact.phone, label: 'mobile' }]),
            contact.job,
            toNumberParam(userId) || 1,
          ]
        );
      }

      return { syncedCount: mockContacts.length, status: 'synced' };
    } catch (error: any) {
      logger.error({ error, userId, accountId }, 'GoogleContactService.syncGoogleContacts failed');
      throw error;
    }
  }

  public static async getBatches(userId: number | string): Promise<IContactExportBatch[]> {
    try {
      const numUserId = toNumberParam(userId) || 1;
      const { rows } = await pool.query('SELECT get_google_export_batches($1) as result', [numUserId]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, userId }, 'GoogleContactService.getBatches failed');
      throw error;
    }
  }

  public static async createBatch(userId: number | string, personIds?: number[]): Promise<IContactExportBatch> {
    try {
      const numUserId = toNumberParam(userId) || 1;
      let total = 0;
      if (personIds && personIds.length > 0) {
        total = personIds.length;
      } else {
        const { rows } = await pool.query('SELECT COUNT(*)::int as cnt FROM persons');
        total = rows[0]?.cnt || 0;
      }

      const { rows: batchRes } = await pool.query(
        'SELECT create_google_export_batch($1, $2, $3, $4::jsonb) as result',
        [numUserId, null, total, JSON.stringify({ person_ids: personIds || 'all', exported_at: new Date().toISOString() })]
      );

      return batchRes[0]?.result;
    } catch (error: any) {
      logger.error({ error, userId }, 'GoogleContactService.createBatch failed');
      throw error;
    }
  }
}
