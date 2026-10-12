import { pool } from '@/config/db';
import { CoreConfigRow, CoreConfigMap } from '@/interfaces/config.interface';

import path from 'path';
import fs from 'fs';

export class ConfigService {
  /**
   * Get all configuration settings as a key-value object map
   */
  public async getAllConfigs(): Promise<CoreConfigMap> {
    const result = await pool.query<CoreConfigRow>('SELECT * FROM public.fn_get_core_config()');
    const configs: CoreConfigMap = {};
    for (const row of result.rows) {
      let val = row.value;
      if (
        (row.code === 'general.general.admin_logo.logo_image' ||
          row.code === 'general.general.admin_logo.favicon_image') &&
        val &&
        val.startsWith('/uploads/config/')
      ) {
        const localPath = path.join(process.cwd(), val.replace(/^\//, ''));
        if (fs.existsSync(localPath)) {
          try {
            const buf = fs.readFileSync(localPath);
            const ext = path.extname(localPath).toLowerCase().replace('.', '');
            const mime =
              ext === 'ico'
                ? 'image/x-icon'
                : ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : 'image/png';
            val = `data:${mime};base64,${buf.toString('base64')}`;
          } catch {
            // Keep original val
          }
        }
      }
      configs[row.code] = val;
    }
    return configs;
  }

  /**
   * Save multiple configuration key-value pairs
   */
  public async saveConfigs(settings: Record<string, any>): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [code, val] of Object.entries(settings)) {
        const stringVal = val === null || val === undefined ? '' : String(val);
        await client.query('SELECT public.fn_save_core_config($1, $2)', [code, stringVal]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const configService = new ConfigService();
