import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: () => null, // don't infinitely retry if local redis is not running
});

redis.on('error', () => {
  // Silent error when redis is unavailable
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') return;
  try {
    await redis.connect();
    logger.info('Redis connection OK');
  } catch (_err) {
    logger.info('Redis is not running locally (optional cache skipped)');
  }
}
