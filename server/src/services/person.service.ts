import { pool } from '@/config/db';
import { IPerson } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { PoolClient } from 'pg';
import { WorkflowService } from './workflow.service';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const cleanEmailVal = (raw: string): string => {
  const s = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/gi, ' ')
    .replace(/&gt;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\bmailto:\s*/gi, '')
    .trim();
  const m = s.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase().trim() : s.replace(/^[<>"'\s]+|[<>"'\s]+$/g, '').trim();
};

const parsePersonField = (val: any, defaultLabel = 'work'): Array<{ label: string; value: string }> => {
  if (!val) return [];
  const parseStr = (str: string, lbl = defaultLabel): Array<{ label: string; value: string }> => {
    let clean = str.trim().replace(/""/g, '"');
    if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) clean = clean.slice(1, -1);
    if ((clean.startsWith('[') && clean.endsWith(']')) || (clean.startsWith('{') && clean.endsWith('}'))) {
      try {
        const p = JSON.parse(clean);
        return parsePersonField(p, lbl);
      } catch {}
    }
    clean = clean.replace(/<[^>]+>/g, ' ').replace(/\bmailto:\s*/gi, '').trim();
    if (clean.includes(':') || clean.includes(',')) {
      const parts = clean.split(',');
      const res: Array<{ label: string; value: string }> = [];
      for (const p of parts) {
        const t = p.trim();
        if (!t) continue;
        if (t.includes(':')) {
          const idx = t.indexOf(':');
          const l = t.substring(0, idx).trim();
          const v = t.substring(idx + 1).trim();
          const isValidLabel = /^[a-zA-Z0-9_-]{1,20}$/.test(l) && !/^mailto$/i.test(l) && !/^https?$/i.test(l);
          if (isValidLabel && v) {
            res.push({ label: l || lbl, value: v.includes('@') ? cleanEmailVal(v) : v });
          } else if (v) {
            res.push({ label: lbl, value: t.includes('@') ? cleanEmailVal(t) : v });
          }
        } else {
          res.push({ label: lbl, value: t.includes('@') ? cleanEmailVal(t) : t });
        }
      }
      if (res.length > 0) return res;
    }
    return [{ label: lbl, value: clean.includes('@') ? cleanEmailVal(clean) : clean }];
  };

  if (Array.isArray(val)) {
    const res: Array<{ label: string; value: string }> = [];
    for (const item of val) {
      if (typeof item === 'object' && item !== null) {
        const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
        const rawLabel = item.label && !/^mailto$/i.test(String(item.label).trim()) ? String(item.label).trim() : defaultLabel;
        const itemLabel = rawLabel.replace(/<[^>]+>/g, '').trim() || defaultLabel;
        if (typeof itemVal === 'string' && (itemVal.startsWith('[') || itemVal.startsWith('{') || itemVal.includes(':') || itemVal.includes(',') || itemVal.includes('<'))) {
          res.push(...parseStr(itemVal, itemLabel));
        } else if (itemVal) {
          const vStr = String(itemVal).trim();
          res.push({ label: itemLabel, value: vStr.includes('@') ? cleanEmailVal(vStr) : vStr.replace(/<[^>]+>/g, '').trim() });
        }
      } else if (typeof item === 'string') {
        res.push(...parseStr(item, defaultLabel));
      }
    }
    return res;
  }
  if (typeof val === 'string') return parseStr(val, defaultLabel);
  return [];
};

export class PersonService {
  // DB Function call: get_all_persons(p_search, p_limit, p_offset)
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : null;
      const offset = (page - 1) * perPage;

      const { rows } = await client.query('SELECT get_all_persons($1, $2, $3) as result', [
        search || null,
        perPage,
        offset,
      ]);

      const resData = rows[0]?.result || { rows: [], total: 0 };
      const cleanedRows = (resData.rows || []).map((row: any) => ({
        ...row,
        emails: parsePersonField(row.emails, 'work'),
        contact_numbers: parsePersonField(row.contact_numbers, 'work'),
      }));

      return {
        rows: cleanedRows,
        total: Number(resData.total) || 0,
      };
    } catch (error: any) {
      logger.error({ error, params }, 'PersonService.getAll failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: get_person(p_id)
  public static async getById(id: number | string): Promise<any | null> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);
      if (!personId) return null;

      client = await pool.connect();
      const { rows } = await client.query('SELECT get_person($1) as result', [personId]);
      const person = rows[0]?.result || null;
      if (!person) return null;

      const cleanJobTitle = (title: any) => {
        if (!title || typeof title !== 'string') return title || '';
        if (title.includes('{') || title.includes('[') || title.includes('"')) {
          return '';
        }
        return title;
      };

      const cleanedPerson = {
        ...person,
        emails: parsePersonField(person.emails, 'work'),
        contact_numbers: parsePersonField(person.contact_numbers, 'work'),
        job_title: cleanJobTitle(person.job_title),
      };

      const activitiesRes = await client.query(
        'SELECT * FROM public.fn_get_all_activities(null, 1, 50, null, $1)',
        [personId]
      ).catch(() => ({ rows: [] }));

      const leadsRes = await client.query(
        'SELECT * FROM public.fn_get_all_leads($1, $2, $3, $4, $5, $6, $7)',
        ['', 1, 50, null, null, null, personId]
      ).catch(() => ({ rows: [] }));

      return {
        ...cleanedPerson,
        activities: activitiesRes.rows,
        leads: leadsRes.rows,
      };
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.getById failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  public static async checkDuplicate(params: {
    email?: string;
    phone?: string;
    excludeId?: number | string | null;
  }): Promise<{ isDuplicate: boolean; field?: 'email' | 'phone'; message?: string; existingPerson?: any }> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const personId = toNumberParam(params.excludeId);

      if (params.email && params.email.trim().includes('@')) {
        const emailVal = params.email.trim().toLowerCase();
        const { rows } = await client.query(
          'SELECT id, name, organization_id FROM public.persons WHERE ($2::integer IS NULL OR id <> $2::integer) AND emails::text ILIKE $1 LIMIT 1',
          ['%' + emailVal + '%', personId]
        );
        if (rows.length > 0) {
          return {
            isDuplicate: true,
            field: 'email',
            message: `Email address "${emailVal}" is already registered to another contact (${rows[0].name}).`,
            existingPerson: rows[0],
          };
        }
      }

      if (params.phone && params.phone.trim().length >= 3) {
        const phoneVal = params.phone.trim();
        const digits = phoneVal.replace(/[^0-9]/g, '');
        const searchPattern = digits.length >= 7 ? '%' + digits + '%' : '%' + phoneVal + '%';
        const { rows } = await client.query(
          'SELECT id, name, organization_id FROM public.persons WHERE ($2::integer IS NULL OR id <> $2::integer) AND contact_numbers::text ILIKE $1 LIMIT 1',
          [searchPattern, personId]
        );
        if (rows.length > 0) {
          return {
            isDuplicate: true,
            field: 'phone',
            message: `Contact number "${phoneVal}" is already registered to another contact (${rows[0].name}).`,
            existingPerson: rows[0],
          };
        }
      }

      return { isDuplicate: false };
    } finally {
      if (client) client.release();
    }
  }

  // Unified DB Function call: save_person(...)
  public static async save(
    data: {
      name: string;
      emails?: any;
      contact_numbers?: any;
      organization_id?: number | null;
      job_title?: string | null;
      user_id?: number | null;
      custom_attributes?: Record<string, any>;
    },
    id?: number | string
  ): Promise<IPerson> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);

      // Extract emails for duplicate validation
      const emailList: string[] = [];
      if (Array.isArray(data.emails)) {
        data.emails.forEach((item: any) => {
          const val = typeof item === 'object' ? (item.value || item.email) : String(item);
          if (val && typeof val === 'string' && val.trim().includes('@')) {
            emailList.push(val.trim().toLowerCase());
          }
        });
      } else if (typeof data.emails === 'string' && data.emails.includes('@')) {
        try {
          const parsed = JSON.parse(data.emails);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const val = typeof item === 'object' ? (item.value || item.email) : String(item);
              if (val && typeof val === 'string' && val.trim().includes('@')) {
                emailList.push(val.trim().toLowerCase());
              }
            });
          }
        } catch {
          if (data.emails.includes('@')) emailList.push(data.emails.trim().toLowerCase());
        }
      }

      // Extract phone numbers for duplicate validation
      const phoneList: string[] = [];
      if (Array.isArray(data.contact_numbers)) {
        data.contact_numbers.forEach((item: any) => {
          const val = typeof item === 'object' ? (item.value || item.number || item.phone) : String(item);
          if (val && typeof val === 'string' && val.trim().length >= 3) {
            phoneList.push(val.trim());
          }
        });
      } else if (typeof data.contact_numbers === 'string' && data.contact_numbers.trim().length >= 3) {
        try {
          const parsed = JSON.parse(data.contact_numbers);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const val = typeof item === 'object' ? (item.value || item.number || item.phone) : String(item);
              if (val && typeof val === 'string' && val.trim().length >= 3) {
                phoneList.push(val.trim());
              }
            });
          }
        } catch {
          if (data.contact_numbers.trim().length >= 3) phoneList.push(data.contact_numbers.trim());
        }
      }

      // Intra-array duplicate check for emails
      const seenEmailSet = new Set<string>();
      for (const emailVal of emailList) {
        if (seenEmailSet.has(emailVal)) {
          throw new ApiError(400, `Duplicate email address "${emailVal}" is not allowed.`);
        }
        seenEmailSet.add(emailVal);
      }

      // Intra-array duplicate check for phone numbers
      const seenPhoneSet = new Set<string>();
      for (const phoneVal of phoneList) {
        const digits = phoneVal.replace(/[^0-9]/g, '');
        if (digits && seenPhoneSet.has(digits)) {
          throw new ApiError(400, `Duplicate contact number "${phoneVal}" is not allowed.`);
        }
        if (digits) seenPhoneSet.add(digits);
      }

      client = await pool.connect();

      // Validate Duplicate Emails against other persons
      for (const emailVal of emailList) {
        const { rows: dupEmails } = await client.query(
          'SELECT id, name FROM public.persons WHERE ($2::integer IS NULL OR id <> $2::integer) AND emails::text ILIKE $1 LIMIT 1',
          ['%' + emailVal + '%', personId]
        );
        if (dupEmails.length > 0) {
          throw new ApiError(400, `Email address "${emailVal}" is already registered to another contact (${dupEmails[0].name}).`);
        }
      }

      // Validate Duplicate Phones against other persons
      for (const phoneVal of phoneList) {
        const digits = phoneVal.replace(/[^0-9]/g, '');
        const searchPattern = digits.length >= 7 ? '%' + digits + '%' : '%' + phoneVal + '%';
        const { rows: dupPhones } = await client.query(
          'SELECT id, name FROM public.persons WHERE ($2::integer IS NULL OR id <> $2::integer) AND contact_numbers::text ILIKE $1 LIMIT 1',
          [searchPattern, personId]
        );
        if (dupPhones.length > 0) {
          throw new ApiError(400, `Contact number "${phoneVal}" is already registered to another contact (${dupPhones[0].name}).`);
        }
      }

      const emailsJson = typeof data.emails === 'object' ? JSON.stringify(data.emails) : (data.emails || '[]');
      const contactsJson = typeof data.contact_numbers === 'object' ? JSON.stringify(data.contact_numbers) : (data.contact_numbers || '[]');
      const customAttrsJson = typeof data.custom_attributes === 'object' ? JSON.stringify(data.custom_attributes) : (data.custom_attributes || '{}');
      const orgId = toNumberParam(data.organization_id);
      const userId = toNumberParam(data.user_id);

      const { rows } = await client.query(
        'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb, $8) as result',
        [data.name.trim(), emailsJson, contactsJson, orgId, data.job_title || null, userId, customAttrsJson, personId]
      );

      if (!rows[0]?.result) {
        throw new ApiError(404, 'Person not found or save failed');
      }
      const savedPerson = rows[0].result;
      const isUpdate = Boolean(personId && personId > 0);
      WorkflowService.triggerWorkflows('persons', isUpdate ? 'update' : 'create', savedPerson).catch((e) => logger.error(e));
      return savedPerson;
    } catch (error: any) {
      logger.error({ error, data, id }, 'PersonService.save failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: delete_person(p_id)
  public static async delete(id: number | string): Promise<boolean> {
    let client: PoolClient | undefined;
    try {
      const personId = toNumberParam(id);
      if (!personId) return false;

      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT delete_person($1) as result',
        [personId]
      );
      const isDeleted = Boolean(rows[0]?.result);
      if (isDeleted) {
        WorkflowService.triggerWorkflows('persons', 'delete', { id: personId }).catch((e) => logger.error(e));
      }
      return isDeleted;
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.delete failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  // DB Function call: delete_all_persons()
  public static async deleteAll(): Promise<number> {
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      const { rows } = await client.query(
        'SELECT delete_all_persons() as result'
      );
      return Number(rows[0]?.result) || 0;
    } catch (error: any) {
      logger.error({ error }, 'PersonService.deleteAll failed');
      throw error;
    } finally {
      if (client) client.release();
    }
  }
}
