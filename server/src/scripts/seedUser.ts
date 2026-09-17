import bcrypt from 'bcrypt';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { UserModel } from '@/models/user.model';
import { logger } from '@/utils/logger';

async function main(): Promise<void> {
  await UserModel.createTableIfNotExists();

  const existing = await UserModel.findByEmail(env.SEED_ADMIN_EMAIL);
  if (existing) {
    logger.info(`Admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);
  await UserModel.create({
    name: 'Admin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
  });

  logger.info(`Created admin user: ${env.SEED_ADMIN_EMAIL}`);
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed script failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
