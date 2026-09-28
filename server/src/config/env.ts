import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3040),
    CLIENT_ORIGIN: z.string().default('https://crm.imorse.digital'),
    DATABASE_URL: z.string().optional(),
    PGHOST: z.string().default('localhost'),
    PGPORT: z.coerce.number().default(5432),
    PGUSER: z.string().default('postgres'),
    PGPASSWORD: z.string().default('postgres'),
    PGDATABASE: z.string().default('crm_db'),
    STU_PGDATABASE: z.string().optional(),
    PGSTUIMAGE: z.string().optional(),
    PG_POOL_MAX: z.coerce.number().default(10),
    PG_IDLE_TIMEOUT: z.coerce.number().default(30000),
    PAGINATION_PAGE_SIZE: z.coerce.number().default(10),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET should be at least 16 characters')
      .default('X5qrDXMJawa0B+mDYWVkV3HR6gvHr2AO82bETooC7JU='),
    jwt_secret_key: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    SEED_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
    SEED_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z.union([z.boolean(), z.string()]).optional().transform((v) => v === true || v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM_EMAIL: z.string().optional(),
    SMTP_FROM_NAME: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    JWT_SECRET: data.jwt_secret_key || data.JWT_SECRET,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
