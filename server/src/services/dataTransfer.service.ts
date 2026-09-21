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
    rows: any[]
  ): Promise<{ importId: number; total: number; processed: number; errors: number; details: any }> {
    let processed = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (type === 'leads') {
          if (!row.title) throw new Error('Row ' + (i + 1) + ': title is required');
          await pool.query(
            'INSERT INTO leads (title, description, lead_value, status, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW())',
            [row.title, row.description || null, row.lead_value ? Number(row.lead_value) : 0]
          );
        } else if (type === 'persons') {
          if (!row.name) throw new Error('Row ' + (i + 1) + ': name is required');
          const emails = row.email ? [{ value: row.email, label: 'work' }] : [];
          const numbers = row.phone ? [{ value: row.phone, label: 'work' }] : [];
          await pool.query(
            'INSERT INTO persons (name, emails, contact_numbers, job_title, created_at, updated_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW(), NOW())',
            [row.name, JSON.stringify(emails), JSON.stringify(numbers), row.job_title || null]
          );
        } else if (type === 'organizations') {
          if (!row.name) throw new Error('Row ' + (i + 1) + ': name is required');
          const address = { address: row.address || '', city: row.city || '', country: row.country || '' };
          await pool.query(
            'INSERT INTO organizations (name, address, created_at, updated_at) VALUES ($1, $2::jsonb, NOW(), NOW())',
            [row.name, JSON.stringify(address)]
          );
        } else if (type === 'products') {
          if (!row.sku) throw new Error('Row ' + (i + 1) + ': sku is required');
          await pool.query(
            'INSERT INTO products (sku, name, description, quantity, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
            [row.sku, row.name || row.sku, row.description || null, Number(row.quantity) || 0, Number(row.price) || 0]
          );
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
      error_samples: errorDetails.slice(0, 10),
    };

    const state = errorCount === 0 ? 'completed' : (processed > 0 ? 'partial' : 'failed');
    const { rows: res } = await pool.query(
      'SELECT save_import_record($1, $2, $3, $4::jsonb, $5) as result',
      [type, action, state, JSON.stringify(summary), errorDetails.length ? JSON.stringify(errorDetails) : null]
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
