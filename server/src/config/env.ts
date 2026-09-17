import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().default(5432),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().default('crm_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be at least 16 characters').default('super_secret_jwt_key_for_crm_database_2026!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
