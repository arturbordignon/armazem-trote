import 'server-only';
import { type ConnectionOptions, Queue } from 'bullmq';
import { config } from './config';

export const TELEGRAM_QUEUE = 'telegrams';

export interface TelegramJobs {
  'order-telegram': { orderId: number };
}

const RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 2_000;
const KEEP_COMPLETED = 1_000;
const KEEP_FAILED = 5_000;

/**
 * BullMQ needs its own connections (blocking commands, and `maxRetriesPerRequest: null` so
 * workers wait out Redis restarts instead of failing jobs).
 */
export function queueConnection(): ConnectionOptions {
  const url = new URL(config.redis.url);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    db: Number(url.pathname.slice(1) || 0),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

let telegramQueue: Queue | undefined;

function getTelegramQueue(): Queue {
  telegramQueue ??= new Queue(TELEGRAM_QUEUE, {
    connection: queueConnection(),
    defaultJobOptions: {
      attempts: RETRY_ATTEMPTS,
      backoff: { type: 'exponential', delay: RETRY_BASE_DELAY_MS },
      removeOnComplete: KEEP_COMPLETED,
      removeOnFail: KEEP_FAILED,
    },
  });
  return telegramQueue;
}

/** Queues the confirmation telegram. The job id makes a retried enqueue a no-op. */
export async function enqueueOrderTelegram(orderId: number): Promise<void> {
  const payload: TelegramJobs['order-telegram'] = { orderId };
  await getTelegramQueue().add('order-telegram', payload, { jobId: `order-telegram-${orderId}` });
}

export async function closeQueues(): Promise<void> {
  await telegramQueue?.close();
}
