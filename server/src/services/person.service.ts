import { pool } from '@/config/db';
import { IPerson } from '@/interfaces/crm.interface';
import { ApiError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
          if (v) res.push({ label: l || lbl, value: v });
        } else {
          res.push({ label: lbl, value: t });
        }
      }
      if (res.length > 0) return res;
    }
    return [{ label: lbl, value: clean }];
  };

  if (Array.isArray(val)) {
    const res: Array<{ label: string; value: string }> = [];
    for (const item of val) {
      if (typeof item === 'object' && item !== null) {
        const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
        const itemLabel = item.label || defaultLabel;
        if (typeof itemVal === 'string' && (itemVal.startsWith('[') || itemVal.startsWith('{') || itemVal.includes(':') || itemVal.includes(','))) {
          res.push(...parseStr(itemVal, itemLabel));
        } else if (itemVal) {
          res.push({ label: itemLabel, value: String(itemVal).trim() });
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
  public static async getAll(params: { page?: number; perPage?: number; search?: string }): Promise<{ rows: any[]; total: number }> {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const perPage = Math.max(1, Number(params.perPage) || 10);
      const search = params.search ? String(params.search).trim() : '';
      const offset = (page - 1) * perPage;

      const { rows } = await pool.query('SELECT get_all_persons($1, $2, $3) as result', [
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
    }
  }

  public static async getById(id: number | string): Promise<any | null> {
    try {
      const personId = toNumberParam(id);
      if (!personId) return null;

      const { rows } = await pool.query('SELECT get_person($1) as result', [personId]);
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

      const activitiesRes = await pool.query(
        `SELECT * FROM activities WHERE id IN (
           SELECT activity_id FROM activity_participants WHERE person_id = $1
         ) ORDER BY id DESC`,
        [personId]
      ).catch(() => ({ rows: [] }));

      const leadsRes = await pool.query(
        `SELECT * FROM leads WHERE person_id = $1 ORDER BY id DESC`,
        [personId]
      ).catch(() => ({ rows: [] }));

      return {
        ...cleanedPerson,
        activities: activitiesRes.rows,
        leads: leadsRes.rows,
      };
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.getById failed');
      throw error;
    }
  }

  // Unified single function for Add & Edit
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
    try {
      const personId = toNumberParam(id);
      const emailsJson = typeof data.emails === 'object' ? JSON.stringify(data.emails) : (data.emails || '[]');
      const contactsJson = typeof data.contact_numbers === 'object' ? JSON.stringify(data.contact_numbers) : (data.contact_numbers || '[]');
      const customAttrsJson = typeof data.custom_attributes === 'object' ? JSON.stringify(data.custom_attributes) : (data.custom_attributes || '{}');
      const orgId = toNumberParam(data.organization_id);
      const userId = toNumberParam(data.user_id);

      const { rows } = await pool.query(
        'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb, $8) as result',
        [
          data.name.trim(),
          emailsJson,
          contactsJson,
          orgId,
          data.job_title || null,
          userId,
          customAttrsJson,
          personId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'PersonService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const personId = toNumberParam(id);
      if (!personId) return false;

      const { rows } = await pool.query('SELECT delete_person($1) as result', [personId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'PersonService.delete failed');
      throw error;
    }
  }
}
