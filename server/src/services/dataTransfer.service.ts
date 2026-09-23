import { pool } from '@/config/db';
import { IImport } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

export class DataTransferService {
  public static async getAllImports(): Promise<IImport[]> {
    try {
      const { rows } = await pool.query('SELECT get_all_imports() as result');
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error }, 'DataTransferService.getAllImports failed');
      throw error;
    }
  }

  public static async processImport(
    type: 'leads' | 'persons' | 'organizations' | 'products',
    action: 'append' | 'overwrite',
    validationStrategy: 'stop_on_errors' | 'skip_error_entries',
    allowedErrors: number,
    rows: any[],
    fileName?: string,
    fieldSeparator: string = ',',
    processInQueue: boolean = false
  ): Promise<{ importId: number; total: number; processed: number; errors: number; details: any }> {
    let processed = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (type === 'leads') {
          const titleVal = row.title || row.Title || row['Lead Title'];
          if (!titleVal) throw new Error('Row ' + (i + 1) + ': title is required');
          const titleStr = String(titleVal).trim();

          const toNumberParam = (v: any): number | null => {
            if (v === undefined || v === null || v === '') return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };

          // Resolve person_id
          let finalPersonId: number | null = toNumberParam(row.person_id || row.personId || row['Person ID']);
          if (!finalPersonId) {
            const pName = row.person_name || row.person || row['Person Name'] || row.Person;
            if (pName) {
              const pMatch = await pool.query('SELECT id FROM persons WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1', [String(pName).trim()]);
              if (pMatch.rows.length > 0) finalPersonId = pMatch.rows[0].id;
            }
          }

          // Resolve organization_id
          let finalOrgId: number | null = toNumberParam(row.organization_id || row.organizationId || row['Organization ID']);
          if (!finalOrgId) {
            const orgName = row.organization_name || row.organization || row['Organization Name'] || row.Organization;
            if (orgName) {
              const orgMatch = await pool.query('SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1', [String(orgName).trim()]);
              if (orgMatch.rows.length > 0) finalOrgId = orgMatch.rows[0].id;
            }
          }

          // Resolve user_id
          let finalUserId: number | null = toNumberParam(row.user_id || row.userId || row['User ID'] || row.sales_owner_id);
          if (!finalUserId) {
            const uName = row.user_name || row.sales_owner || row['Sales Owner'] || row.User;
            if (uName) {
              const uMatch = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER($1) OR LOWER(TRIM(email)) = LOWER($1) LIMIT 1', [String(uName).trim()]);
              if (uMatch.rows.length > 0) finalUserId = uMatch.rows[0].id;
            }
          }

          const leadValue = row.lead_value || row.leadValue || row.Value ? Number(row.lead_value || row.leadValue || row.Value) : 0;
          const description = row.description || row.Description || null;
          const status = row.status || row.Status || 'Open';

          // Duplicate check by title
          const existingLead = await pool.query('SELECT id FROM leads WHERE LOWER(TRIM(title)) = LOWER($1) LIMIT 1', [titleStr]);
          if (existingLead.rows.length > 0) {
            await pool.query(
              'UPDATE leads SET description = COALESCE($1, description), lead_value = COALESCE($2, lead_value), person_id = COALESCE($3, person_id), organization_id = COALESCE($4, organization_id), user_id = COALESCE($5, user_id), updated_at = NOW() WHERE id = $6',
              [description, leadValue, finalPersonId, finalOrgId, finalUserId, existingLead.rows[0].id]
            );
          } else {
            await pool.query(
              'INSERT INTO leads (title, description, lead_value, person_id, organization_id, user_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
              [titleStr, description, leadValue, finalPersonId, finalOrgId, finalUserId, status]
            );
          }
        } else if (type === 'persons') {
          const nameVal = row.name || row.Name || row['Person Name'];
          if (!nameVal) throw new Error('Row ' + (i + 1) + ': name is required');
          const nameStr = String(nameVal).trim();

          const cleanJobTitle = (title: any) => {
            if (!title || typeof title !== 'string') return null;
            if (title.includes('{') || title.includes('[') || title.includes('"')) return null;
            return title.trim();
          };

          const parseField = (val: any, defaultLabel = 'work'): Array<{ label: string; value: string }> => {
            if (!val) return [];
            const parseStr = (str: string, lbl = defaultLabel): Array<{ label: string; value: string }> => {
              let clean = str.trim().replace(/""/g, '"');
              if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) clean = clean.slice(1, -1);
              if ((clean.startsWith('[') && clean.endsWith(']')) || (clean.startsWith('{') && clean.endsWith('}'))) {
                try {
                  const p = JSON.parse(clean);
                  return parseField(p, lbl);
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

          const newEmails = parseField(row.emails || row.email || row.Emails || row.Email, 'work');
          const newNumbers = parseField(row.contact_numbers || row.phone || row.Phone || row.Contact, 'work');

          const toNumberParam = (v: any): number | null => {
            if (v === undefined || v === null || v === '') return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };

          // Resolve organization_id
          const rawOrgId = toNumberParam(row.organization_id || row.organizationId || row['Organization ID']);
          let finalOrgId: number | null = rawOrgId;
          if (!finalOrgId) {
            const orgName = row.organization_name || row.organization || row['Organization Name'] || row.Organization;
            if (orgName) {
              const orgMatch = await pool.query(
                'SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1',
                [String(orgName).trim()]
              );
              if (orgMatch.rows.length > 0) {
                finalOrgId = orgMatch.rows[0].id;
              }
            }
          }

          // Resolve user_id
          const rawUserId = toNumberParam(row.user_id || row.userId || row['User ID'] || row.sales_owner_id);
          let finalUserId: number | null = rawUserId;
          if (!finalUserId) {
            const userName = row.user_name || row.sales_owner || row['Sales Owner'] || row.User;
            if (userName) {
              const userMatch = await pool.query(
                'SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER($1) OR LOWER(TRIM(email)) = LOWER($1) LIMIT 1',
                [String(userName).trim()]
              );
              if (userMatch.rows.length > 0) {
                finalUserId = userMatch.rows[0].id;
              }
            }
          }

          // Duplicate entry check
          const existing = await pool.query(
            'SELECT id, emails, contact_numbers FROM persons WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1',
            [nameStr]
          );

          if (existing.rows.length > 0) {
            const existingPerson = existing.rows[0];
            const oldEmails = parseField(existingPerson.emails, 'work');
            const oldNumbers = parseField(existingPerson.contact_numbers, 'work');

            // Merge & deduplicate emails
            const mergedEmailsMap = new Map<string, string>();
            for (const e of [...oldEmails, ...newEmails]) {
              if (e.value && !mergedEmailsMap.has(e.value.toLowerCase())) {
                mergedEmailsMap.set(e.value.toLowerCase(), e.label || 'work');
              }
            }
            const mergedEmails = Array.from(mergedEmailsMap.entries()).map(([value, label]) => ({ label, value }));

            // Merge & deduplicate numbers
            const mergedNumbersMap = new Map<string, string>();
            for (const n of [...oldNumbers, ...newNumbers]) {
              if (n.value && !mergedNumbersMap.has(n.value.toLowerCase())) {
                mergedNumbersMap.set(n.value.toLowerCase(), n.label || 'work');
              }
            }
            const mergedNumbers = Array.from(mergedNumbersMap.entries()).map(([value, label]) => ({ label, value }));

            await pool.query(
              'UPDATE persons SET emails = $1::jsonb, contact_numbers = $2::jsonb, job_title = COALESCE($3, job_title), organization_id = COALESCE($4, organization_id), user_id = COALESCE($5, user_id), updated_at = NOW() WHERE id = $6',
              [
                JSON.stringify(mergedEmails), 
                JSON.stringify(mergedNumbers), 
                cleanJobTitle(row.job_title || row.JobTitle), 
                finalOrgId, 
                finalUserId, 
                existingPerson.id
              ]
            );
          } else {
            // Deduplicate newEmails & newNumbers
            const uniqueEmailsMap = new Map<string, string>();
            for (const e of newEmails) {
              if (e.value && !uniqueEmailsMap.has(e.value.toLowerCase())) {
                uniqueEmailsMap.set(e.value.toLowerCase(), e.label || 'work');
              }
            }
            const uniqueEmails = Array.from(uniqueEmailsMap.entries()).map(([value, label]) => ({ label, value }));

            const uniqueNumbersMap = new Map<string, string>();
            for (const n of newNumbers) {
              if (n.value && !uniqueNumbersMap.has(n.value.toLowerCase())) {
                uniqueNumbersMap.set(n.value.toLowerCase(), n.label || 'work');
              }
            }
            const uniqueNumbers = Array.from(uniqueNumbersMap.entries()).map(([value, label]) => ({ label, value }));

            await pool.query(
              'INSERT INTO persons (name, emails, contact_numbers, job_title, organization_id, user_id, created_at, updated_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, NOW(), NOW())',
              [
                nameStr, 
                JSON.stringify(uniqueEmails), 
                JSON.stringify(uniqueNumbers), 
                cleanJobTitle(row.job_title || row.JobTitle),
                finalOrgId,
                finalUserId
              ]
            );
          }
        } else if (type === 'organizations') {
          const nameVal = row.name || row.Name || row['Organization Name'];
          if (!nameVal) throw new Error('Row ' + (i + 1) + ': name is required');
          const nameStr = String(nameVal).trim();

          const toNumberParam = (v: any): number | null => {
            if (v === undefined || v === null || v === '') return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };

          // Resolve user_id
          let finalUserId: number | null = toNumberParam(row.user_id || row.userId || row['User ID'] || row.sales_owner_id);
          if (!finalUserId) {
            const uName = row.user_name || row.sales_owner || row['Sales Owner'] || row.User;
            if (uName) {
              const uMatch = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER($1) OR LOWER(TRIM(email)) = LOWER($1) LIMIT 1', [String(uName).trim()]);
              if (uMatch.rows.length > 0) finalUserId = uMatch.rows[0].id;
            }
          }

          const address = {
            address: row.address || row.Address || '',
            city: row.city || row.City || '',
            state: row.state || row.State || '',
            country: row.country || row.Country || '',
            postcode: row.postcode || row.zip || row.Postcode || ''
          };

          // Duplicate check by organization name
          const existingOrg = await pool.query('SELECT id FROM organizations WHERE LOWER(TRIM(name)) = LOWER($1) LIMIT 1', [nameStr]);
          if (existingOrg.rows.length > 0) {
            await pool.query(
              'UPDATE organizations SET address = $1::jsonb, user_id = COALESCE($2, user_id), updated_at = NOW() WHERE id = $3',
              [JSON.stringify(address), finalUserId, existingOrg.rows[0].id]
            );
          } else {
            await pool.query(
              'INSERT INTO organizations (name, address, user_id, created_at, updated_at) VALUES ($1, $2::jsonb, $3, NOW(), NOW())',
              [nameStr, JSON.stringify(address), finalUserId]
            );
          }
        } else if (type === 'products') {
          const skuVal = row.sku || row.SKU || row.code || row.Name || row.name;
          if (!skuVal) throw new Error('Row ' + (i + 1) + ': sku is required');
          const skuStr = String(skuVal).trim();
          const prodName = row.name || row.Name || skuStr;
          const description = row.description || row.Description || null;
          const quantity = Number(row.quantity || row.Quantity || 0);
          const price = Number(row.price || row.Price || 0);

          // Duplicate check by SKU or Name
          const existingProd = await pool.query(
            'SELECT id FROM products WHERE LOWER(TRIM(sku)) = LOWER($1) OR LOWER(TRIM(name)) = LOWER($2) LIMIT 1',
            [skuStr, String(prodName).trim()]
          );

          if (existingProd.rows.length > 0) {
            await pool.query(
              'UPDATE products SET name = COALESCE($1, name), description = COALESCE($2, description), quantity = COALESCE($3, quantity), price = COALESCE($4, price), updated_at = NOW() WHERE id = $5',
              [prodName, description, quantity, price, existingProd.rows[0].id]
            );
          } else {
            await pool.query(
              'INSERT INTO products (sku, name, description, quantity, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
              [skuStr, prodName, description, quantity, price]
            );
          }
        }
        processed++;
      } catch (err: any) {
        errorCount++;
        errorDetails.push({ row: i + 1, error: err.message, data: row });
        if (validationStrategy === 'stop_on_errors' || errorCount > allowedErrors) {
          break;
        }
      }
    }

    const summary = {
      total: rows.length,
      processed,
      errors: errorCount,
      fileName: fileName || `${type}_import.csv`,
      error_samples: errorDetails.slice(0, 10),
    };

    const state = errorCount === 0 ? 'completed' : (processed > 0 ? 'partial' : 'failed');
    
    // Ensure table structure has defaults & DROP NOT NULL on file columns
    try {
      await pool.query(`
        ALTER TABLE imports ADD COLUMN IF NOT EXISTS validation_strategy VARCHAR(50) DEFAULT 'stop_on_errors';
        ALTER TABLE imports ALTER COLUMN validation_strategy SET DEFAULT 'stop_on_errors';
        ALTER TABLE imports ADD COLUMN IF NOT EXISTS allowed_errors INTEGER DEFAULT 0;
        ALTER TABLE imports ALTER COLUMN allowed_errors SET DEFAULT 0;
        ALTER TABLE imports ADD COLUMN IF NOT EXISTS field_separator VARCHAR(10) DEFAULT ',';
        ALTER TABLE imports ALTER COLUMN field_separator SET DEFAULT ',';
        ALTER TABLE imports ADD COLUMN IF NOT EXISTS process_in_queue BOOLEAN DEFAULT false;
        ALTER TABLE imports ALTER COLUMN process_in_queue SET DEFAULT false;

        ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_path TEXT DEFAULT '';
        ALTER TABLE imports ALTER COLUMN file_path DROP NOT NULL;
        ALTER TABLE imports ALTER COLUMN file_path SET DEFAULT '';

        ALTER TABLE imports ADD COLUMN IF NOT EXISTS file_name TEXT DEFAULT '';
        ALTER TABLE imports ALTER COLUMN file_name DROP NOT NULL;
        ALTER TABLE imports ALTER COLUMN file_name SET DEFAULT '';

        ALTER TABLE imports ADD COLUMN IF NOT EXISTS error_file TEXT DEFAULT '';
        ALTER TABLE imports ALTER COLUMN error_file DROP NOT NULL;
        ALTER TABLE imports ALTER COLUMN error_file SET DEFAULT '';
      `);
    } catch {}

    const { rows: res } = await pool.query(
      'SELECT save_import_record($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11) as result',
      [
        type, 
        action, 
        state, 
        JSON.stringify(summary), 
        errorDetails.length ? JSON.stringify(errorDetails) : '',
        validationStrategy || 'stop_on_errors',
        allowedErrors || 0,
        fieldSeparator || ',',
        processInQueue || false,
        '',
        fileName || `${type}_import.csv`
      ]
    );

    return {
      importId: res[0]?.result?.id,
      total: rows.length,
      processed,
      errors: errorCount,
      details: summary,
    };
  }

  public static async exportData(type: string): Promise<any[]> {
    try {
      if (type === 'leads') {
        const { rows } = await pool.query('SELECT id, title, description, lead_value, status, created_at FROM leads ORDER BY id DESC');
        return rows;
      } else if (type === 'persons') {
        const { rows } = await pool.query('SELECT id, name, emails, contact_numbers, job_title, organization_id, created_at FROM persons ORDER BY id DESC');
        return rows;
      } else if (type === 'organizations') {
        const { rows } = await pool.query('SELECT id, name, address, created_at FROM organizations ORDER BY id DESC');
        return rows;
      } else if (type === 'products') {
        const { rows } = await pool.query('SELECT id, sku, name, description, quantity, price, created_at FROM products ORDER BY id DESC');
        return rows;
      }
      return [];
    } catch (error: any) {
      logger.error({ error, type }, 'DataTransferService.exportData failed');
      throw error;
    }
  }
}
