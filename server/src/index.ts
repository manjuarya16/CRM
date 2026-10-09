import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { checkDbConnection } from '@/config/db';
import { connectRedis } from '@/config/redis';
import { createApp } from '@/app';

async function bootstrap(): Promise<void> {
  await checkDbConnection();
  await connectRedis();

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);

    // Start persistent IMAP IDLE lead sync (instant push notifications from Gmail)
    import('@/services/imapLeadSync.service')
      .then(({ ImapLeadSyncService }) => {
        ImapLeadSyncService.startPersistentSync().catch((err: any) => {
          logger.warn(`[ImapBootstrap] Error initializing persistent IMAP sync: ${err.message}`);
        });
      })
      .catch((err) => {
        logger.warn(`[ImapBootstrap] Could not load ImapLeadSyncService: ${err.message}`);
      });
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason: reason?.message || reason }, 'Unhandled Rejection caught safely');
});

process.on('uncaughtException', (err: any) => {
  logger.error({ err: err?.message || err }, 'Uncaught Exception caught safely');
});
