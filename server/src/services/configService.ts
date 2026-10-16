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
        let stringVal = val === null || val === undefined ? '' : String(val);
        if (
          (code === 'general.general.admin_logo.logo_image' ||
            code === 'general.general.admin_logo.favicon_image') &&
          stringVal.startsWith('data:image/')
        ) {
          try {
            const matches = stringVal.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (matches) {
              const rawExt = matches[1].toLowerCase();
              const ext =
                rawExt === 'jpeg'
                  ? 'jpg'
                  : rawExt === 'x-icon' || rawExt === 'vnd.microsoft.icon'
                  ? 'ico'
                  : rawExt;
              const buffer = Buffer.from(matches[2], 'base64');
              const filename = `${code.includes('favicon') ? 'favicon' : 'logo'}-${Date.now()}-${Math.round(
                Math.random() * 1e9
              )}.${ext}`;
              const dir = path.join(process.cwd(), 'uploads', 'config');
              fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path.join(dir, filename), buffer);
              stringVal = `/uploads/config/${filename}`;
            }
          } catch (e) {
            console.error('Error writing base64 image config to disk:', e);
          }
        }
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
