import { Pool, PoolConfig, PoolClient } from 'pg';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { getTenantContext, TenantContextData } from '@/context/tenantContext';

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

pool.on('connect', (client) => {
  client.query('SET search_path TO public, pg_catalog').catch(() => {});
  client.on('error', (err) => {
    logger.error({ err }, 'Unexpected PostgreSQL client connection error');
  });
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

// Original pg methods
const originalPoolConnect = pool.connect.bind(pool);
const originalPoolQuery = pool.query.bind(pool);

/**
 * Smart PoolClient wrapper that transparently injects PostgreSQL Row-Level Security
 * tenant isolation parameters inside a PgBouncer transaction-safe boundary.
 * Defaults to tenant ID '1' (default organization) for single-tenant operations.
 */
function wrapClientWithTenantContext(client: PoolClient, ctx: TenantContextData | undefined): PoolClient {
  const targetTenantId = ctx?.tenantId ? String(ctx.tenantId) : '1';
  const targetIsSuperAdmin = ctx?.isSuperAdmin ? 'true' : 'false';

  let inTransaction = false;
  let txInitialized = false;

  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  const initTx = async () => {
    if (!txInitialized) {
      await originalQuery('BEGIN');
      await originalQuery(
        `SELECT set_config('app.current_tenant_id', $1, true), set_config('app.is_super_admin', $2, true)`,
        [targetTenantId, targetIsSuperAdmin]
      );
      inTransaction = true;
      txInitialized = true;
    }
  };

  client.query = (async (...args: any[]) => {
    const sql = typeof args[0] === 'string' ? args[0].trim().toUpperCase() : '';

    if (sql === 'BEGIN' || sql.startsWith('BEGIN;')) {
      if (inTransaction) {
        return { command: 'BEGIN', rowCount: 0, rows: [] } as any;
      }
      await initTx();
      return { command: 'BEGIN', rowCount: 0, rows: [] } as any;
    }

    if (sql === 'COMMIT' || sql.startsWith('COMMIT;')) {
      if (inTransaction) {
        const res = await originalQuery('COMMIT');
        inTransaction = false;
        return res;
      }
    }

    if (sql === 'ROLLBACK' || sql.startsWith('ROLLBACK;')) {
      if (inTransaction) {
        const res = await originalQuery('ROLLBACK');
        inTransaction = false;
        return res;
      }
    }

    if (!txInitialized) {
      await initTx();
    }

    return (originalQuery as any)(...args);
  }) as any;

  client.release = ((err?: any) => {
    const doRelease = async () => {
      try {
        if (inTransaction) {
          if (err) {
            await originalQuery('ROLLBACK').catch(() => {});
          } else {
            await originalQuery('COMMIT').catch(() => {});
          }
          inTransaction = false;
        }
      } finally {
        client.query = originalQuery;
        client.release = originalRelease;
        originalRelease(err);
      }
    };

    doRelease().catch(() => {
      client.query = originalQuery;
      client.release = originalRelease;
      originalRelease(err);
    });
  }) as any;

  return client;
}

// Intercept pool.connect to auto-wrap clients with active tenant context
(pool as any).connect = async function (...args: any[]) {
  const ctx = getTenantContext();

  if (typeof args[0] === 'function') {
    const cb = args[0];
    return originalPoolConnect((err: any, client: any, release: any) => {
      if (err || !client) return cb(err, client, release);
      const wrapped = wrapClientWithTenantContext(client, ctx);
      cb(null, wrapped, wrapped.release);
    });
  }

  const client = await originalPoolConnect();
  return wrapClientWithTenantContext(client, ctx);
};

// Intercept pool.query to execute with active tenant context
(pool as any).query = async function (textOrConfig: any, values?: any, cb?: any) {
  if (typeof values === 'function') {
    cb = values;
    values = undefined;
  }

  const ctx = getTenantContext();
  const client = await pool.connect();
  try {
    const result = await client.query(textOrConfig, values);
    if (cb) cb(null, result);
    return result;
  } catch (err) {
    if (cb) cb(err);
    else throw err;
  } finally {
    client.release();
  }
};

export async function checkDbConnection(retries = 3, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await originalPoolConnect();
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
