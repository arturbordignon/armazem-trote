import 'server-only';
import { Redis } from 'ioredis';
import { config } from './config';
import { logger } from './logger';

const MAX_RETRIES_PER_REQUEST = 2;
const CONNECT_TIMEOUT_MS = 5_000;

function createRedis(): Redis {
  const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
    connectTimeout: CONNECT_TIMEOUT_MS,
    // Connect on first command, so importing this module (tests, build) opens no socket.
    lazyConnect: true,
    // Batches commands issued in the same tick into one round trip.
    enableAutoPipelining: true,
  });
  // ioredis retries forever and emits an error per attempt; report each outage once.
  let down = false;
  redis.on('error', (error) => {
    if (down) return;
    down = true;
    logger.error({ err: error }, 'redis unavailable; retrying in the background');
  });
  redis.on('ready', () => {
    if (!down) return;
    down = false;
    logger.info('redis connection restored');
  });
  return redis;
}

const globalForRedis = globalThis as typeof globalThis & { __redis?: Redis };
export const redis = globalForRedis.__redis ?? createRedis();
if (!config.isProduction) globalForRedis.__redis = redis;

export async function closeRedis(): Promise<void> {
  // A lazy client that never connected has nothing to flush; quitting it would connect first.
  if (redis.status === 'wait') redis.disconnect();
  else await redis.quit();
}
