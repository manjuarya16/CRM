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

    // Periodic IMAP Lead Sync Worker (every 60s)
    const IMAP_SYNC_INTERVAL_MS = 60 * 1000;
    setInterval(async () => {
      try {
        const { ImapLeadSyncService } = await import('@/services/imapLeadSync.service');
        const config = await ImapLeadSyncService.getImapConfig();
        if (config.enabled && config.username && config.password) {
          await ImapLeadSyncService.syncEmailsAndGenerateLeads();
        }
      } catch (syncErr: any) {
        logger.warn(`[ImapWorker] Periodic sync check error: ${syncErr.message}`);
      }
    }, IMAP_SYNC_INTERVAL_MS);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
