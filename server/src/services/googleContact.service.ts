import { pool } from '@/config/db';
import { IGoogleContactAccount, IContactExportBatch } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsedNumber = Number(value);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
};

export class GoogleContactService {
  public static async getAccounts(userId: number | string): Promise<IGoogleContactAccount[]> {
    try {
      const userIdNumber = toNumberParam(userId) || 1;
      const { rows } = await pool.query('SELECT get_google_accounts($1) as result', [userIdNumber]);
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
      const userIdNumber = toNumberParam(userId) || 1;
      const cleanedToken = data.access_token ? data.access_token.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '') : '';

      const { rows } = await pool.query(
        'SELECT save_google_account($1, $2, $3, $4, $5, $6) as result',
        [
          userIdNumber,
          data.google_email.trim(),
          cleanedToken,
          data.refresh_token || null,
          data.expires_in || 3600,
          data.token_type || 'Bearer',
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, userId, data }, 'GoogleContactService.saveAccount failed');
      throw error;
    }
  }

  public static async disconnectAccount(id: number | string): Promise<boolean> {
    try {
      const accountId = toNumberParam(id);
      if (!accountId) return false;
      const { rows } = await pool.query('SELECT disconnect_google_account($1) as result', [accountId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'GoogleContactService.disconnectAccount failed');
      throw error;
    }
  }

  public static async syncGoogleContacts(userId: number | string, accountId: number | string): Promise<{ syncedCount: number; status: string; message?: string }> {
    try {
      const userIdNumber = toNumberParam(userId) || 1;
      const accountIdNumber = toNumberParam(accountId);

      // 1. Fetch account credentials from database via procedural function
      const { rows } = await pool.query(
        'SELECT * FROM public.get_google_account($1)',
        [accountIdNumber]
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
        const contactName =
          item.names?.[0]?.displayName ||
          item.names?.[0]?.givenName ||
          item.emailAddresses?.[0]?.value ||
          'Unnamed Contact';

        const emails = (item.emailAddresses || []).map((emailItem: any) => ({
          value: emailItem.value,
          label: emailItem.type ? String(emailItem.type).toLowerCase() : 'work',
        }));

        const phones = (item.phoneNumbers || []).map((phoneItem: any) => ({
          value: phoneItem.value || phoneItem.canonicalForm,
          label: phoneItem.type ? String(phoneItem.type).toLowerCase() : 'mobile',
        }));

        const jobTitle =
          item.organizations?.[0]?.title ||
          item.occupations?.[0]?.value ||
          null;

        // Skip contacts with completely empty details
        if (!contactName && emails.length === 0 && phones.length === 0) {
          continue;
        }

        // Insert into persons table via procedural function save_person
        await pool.query(
          'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7) as result',
          [
            contactName,
            JSON.stringify(emails.length > 0 ? emails : []),
            JSON.stringify(phones.length > 0 ? phones : []),
            null,
            null,
            jobTitle,
            userIdNumber,
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
      const userIdNumber = toNumberParam(userId) || 1;
      const { rows } = await pool.query('SELECT get_google_export_batches($1) as result', [userIdNumber]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, userId }, 'GoogleContactService.getBatches failed');
      throw error;
    }
  }

  public static async createBatch(userId: number | string, personIds?: number[]): Promise<IContactExportBatch> {
    try {
      const userIdNumber = toNumberParam(userId) || 1;
      let total = 0;
      if (personIds && personIds.length > 0) {
        total = personIds.length;
      } else {
        const { rows } = await pool.query('SELECT public.fn_get_total_persons_count() as cnt');
        total = rows[0]?.cnt || 0;
      }

      const { rows: batchRes } = await pool.query(
        'SELECT create_google_export_batch($1, $2, $3, $4::jsonb) as result',
        [userIdNumber, null, total, JSON.stringify({ person_ids: personIds || 'all', exported_at: new Date().toISOString() })]
      );

      return batchRes[0]?.result;
    } catch (error: any) {
      logger.error({ error, userId }, 'GoogleContactService.createBatch failed');
      throw error;
    }
  }
}
