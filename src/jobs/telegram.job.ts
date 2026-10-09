import type { Job } from 'bullmq';
import { logger } from '@/lib/logger';
import type { TelegramJobs } from '@/lib/queue';
import { sendOrderTelegram } from '@/services/order.service';

/** Processor for the telegrams queue. Throwing makes BullMQ retry with exponential backoff. */
export async function processTelegramJob(job: Job<TelegramJobs['order-telegram']>): Promise<void> {
  const startedAt = performance.now();
  await sendOrderTelegram(job.data.orderId);
  logger.info(
    { jobId: job.id, attempt: job.attemptsMade + 1, ms: Math.round(performance.now() - startedAt) },
    'telegram job done',
  );
}
