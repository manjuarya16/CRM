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
      const cleanToken = data.access_token ? data.access_token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : '';
      
      // Delete any previous account records for this user to avoid unique constraint collisions
      await pool.query('DELETE FROM google_contact_accounts WHERE user_id = $1', [numUserId]);

      const insertRes = await pool.query(
        `INSERT INTO google_contact_accounts (user_id, google_email, access_token, refresh_token, expires_in, token_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
         RETURNING id, google_email, is_active`,
        [numUserId, data.google_email.trim(), cleanToken, data.refresh_token || null, data.expires_in || 3600, data.token_type || 'Bearer']
      );
      return insertRes.rows[0];
    } catch (error: any) {
      logger.error({ error, userId, data }, 'GoogleContactService.saveAccount failed');
      throw error;
    }
  }

  public static async disconnectAccount(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rowCount } = await pool.query('DELETE FROM google_contact_accounts WHERE id = $1', [numId]);
      return Boolean(rowCount && rowCount > 0);
    } catch (error: any) {
      logger.error({ error, id }, 'GoogleContactService.disconnectAccount failed');
      throw error;
    }
  }

  public static async syncGoogleContacts(userId: number | string, accountId: number | string): Promise<{ syncedCount: number; status: string; message?: string }> {
    try {
      const numUserId = toNumberParam(userId) || 1;
      const numAccountId = toNumberParam(accountId);

      // 1. Fetch account credentials from database
      const { rows } = await pool.query(
        'SELECT * FROM google_contact_accounts WHERE id = $1 AND is_active = TRUE',
        [numAccountId]
      );

      if (rows.length === 0) {
        throw new Error('Google account not found or is inactive');
      }

      const account = rows[0];
      const rawToken = account.access_token || '';
      const token = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');

      if (!token || token.startsWith('mock_')) {
        throw new Error('No valid Google OAuth Token found for this account. Please reconnect this Google account with a valid Google OAuth Access Token.');
      }

      if (token.startsWith('4/') || token.startsWith('4%2F')) {
        throw new Error('You pasted the Authorization Code instead of the Access Token! In Google OAuth Playground (Step 2), click the blue "Exchange authorization code for tokens" button, and copy the Access token (which starts with ya29....).');
      }

      // 2. Fetch real contacts from Google People API with pagination
      let nextPageToken: string | undefined = undefined;
      const allConnections: any[] = [];
      let pageCount = 0;

      do {
        let url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,occupations&pageSize=1000';
        if (nextPageToken) {
          url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const errData: any = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Google API error (status ${response.status})`;
          logger.error({ errData, status: response.status }, 'Google People API fetch failed');
          throw new Error(`Google API returned error: ${errMsg}. If your token expired, please generate a fresh token and reconnect.`);
        }

        const data: any = await response.json();
        const connections = data.connections || [];
        allConnections.push(...connections);

        nextPageToken = data.nextPageToken;
        pageCount++;
      } while (nextPageToken && pageCount < 10); // Safe upper limit (up to 10,000 contacts)

      if (allConnections.length === 0) {
        return { syncedCount: 0, status: 'synced', message: 'No contacts found in this Google account.' };
      }

      let importedCount = 0;

      for (const item of allConnections) {
        const name =
          item.names?.[0]?.displayName ||
          item.names?.[0]?.givenName ||
          item.emailAddresses?.[0]?.value ||
          'Unnamed Contact';

        const emails = (item.emailAddresses || []).map((e: any) => ({
          value: e.value,
          label: e.type ? String(e.type).toLowerCase() : 'work',
        }));

        const phones = (item.phoneNumbers || []).map((p: any) => ({
          value: p.value || p.canonicalForm,
          label: p.type ? String(p.type).toLowerCase() : 'mobile',
        }));

        const jobTitle =
          item.organizations?.[0]?.title ||
          item.occupations?.[0]?.value ||
          null;

        // Skip contacts with completely empty details
        if (!name && emails.length === 0 && phones.length === 0) {
          continue;
        }

        // Insert into persons table
        await pool.query(
          `INSERT INTO persons (name, emails, contact_numbers, job_title, user_id, created_at, updated_at)
           VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, NOW(), NOW())`,
          [
            name,
            JSON.stringify(emails.length > 0 ? emails : []),
            JSON.stringify(phones.length > 0 ? phones : []),
            jobTitle,
            numUserId,
          ]
        );
        importedCount++;
      }

      return {
        syncedCount: importedCount,
        status: 'synced',
        message: `Successfully imported ${importedCount} contacts from your Google account!`,
      };
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
