import { pool } from '@/config/db';
import { CoreConfigRow, CoreConfigMap } from '@/interfaces/config.interface';

export class ConfigService {
  /**
   * Get all configuration settings as a key-value object map
   */
  public async getAllConfigs(): Promise<CoreConfigMap> {
    const result = await pool.query<CoreConfigRow>('SELECT * FROM public.fn_get_core_config()');
    const configs: CoreConfigMap = {};
    for (const row of result.rows) {
      configs[row.code] = row.value;
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
