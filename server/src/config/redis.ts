import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') return;
  try {
    await redis.connect();
    logger.info('Redis connection OK');
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed (optional cache will be skipped)');
  }
}
