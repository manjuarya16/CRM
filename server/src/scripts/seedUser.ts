import bcrypt from 'bcrypt';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { UserService } from '@/services/user.service';
import { logger } from '@/utils/logger';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);
  const existing = await UserService.findByEmail(env.SEED_ADMIN_EMAIL);

  if (existing) {
    await pool.query(
      `UPDATE users SET password = $1, status = true WHERE LOWER(email) = LOWER($2)`,
      [passwordHash, env.SEED_ADMIN_EMAIL],
    );
    logger.info(`Updated admin user password for: ${env.SEED_ADMIN_EMAIL}`);
    logger.info(`Login Email: ${env.SEED_ADMIN_EMAIL} | Password: ${env.SEED_ADMIN_PASSWORD}`);
    return;
  }

  await UserService.create({
    name: 'Admin',
    email: env.SEED_ADMIN_EMAIL,
    passwordHash,
    roleId: 1,
    status: true,
  });

  logger.info(`Created admin user: ${env.SEED_ADMIN_EMAIL}`);
  logger.info(`Login Email: ${env.SEED_ADMIN_EMAIL} | Password: ${env.SEED_ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed script failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
