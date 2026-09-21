import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { checkDbConnection } from '@/config/db';
import { initDbFunctions } from '@/config/dbFunctions';
import { connectRedis } from '@/config/redis';
import { createApp } from '@/app';

async function bootstrap(): Promise<void> {
  await checkDbConnection();
  await initDbFunctions();
  await connectRedis();

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
