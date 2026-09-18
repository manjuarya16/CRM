import { Pool, PoolConfig } from 'pg';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const poolConfig: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT,
    }
  : {
      host: env.PGHOST,
      port: env.PGPORT,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connection OK');
  } finally {
    client.release();
  }
}
