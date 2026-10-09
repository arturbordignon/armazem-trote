// Background worker: `pnpm worker`. Runs outside Next.js, from the same codebase.
import '@/lib/load-env';
import { Worker } from 'bullmq';
import { logger } from '@/lib/logger';
import { TELEGRAM_QUEUE, queueConnection } from '@/lib/queue';
import { closeConnections } from '@/lib/shutdown';
import { processTelegramJob } from './telegram.job';

const CONCURRENCY = 5;

const worker = new Worker(TELEGRAM_QUEUE, processTelegramJob, {
  connection: queueConnection(),
  concurrency: CONCURRENCY,
});

worker.on('ready', () =>
  logger.info({ queue: TELEGRAM_QUEUE, concurrency: CONCURRENCY }, 'worker ready'),
);
worker.on('failed', (job, error) =>
  logger.error({ err: error, jobId: job?.id, attempts: job?.attemptsMade }, 'telegram job failed'),
);

/** Finish in-flight jobs, then release connections, so a deploy never drops a telegram. */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'worker shutting down');
  await worker.close();
  await closeConnections();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    shutdown(signal).catch((error: unknown) => {
      logger.error({ err: error }, 'worker shutdown failed');
      process.exitCode = 1;
    });
  });
}
