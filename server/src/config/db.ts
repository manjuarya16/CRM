import { Pool, PoolConfig } from 'pg';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const poolConfig: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    }
  : {
      host: env.PGHOST,
      port: env.PGPORT,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

export async function checkDbConnection(retries = 3, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        logger.info(`PostgreSQL connection OK (${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE})`);
        return;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (attempt < retries) {
        logger.warn(
          { attempt, retries, host: env.PGHOST, port: env.PGPORT, err: err.message },
          `PostgreSQL connection attempt failed. Retrying in ${delayMs / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.error(
          { host: env.PGHOST, port: env.PGPORT, db: env.PGDATABASE, err },
          `Failed to connect to PostgreSQL at ${env.PGHOST}:${env.PGPORT} after ${retries} attempts.`
        );
        throw err;
      }
    }
  }
}
