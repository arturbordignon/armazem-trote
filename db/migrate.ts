import '@/lib/load-env';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { runMigrations } from './migrator';

const startedAt = performance.now();
try {
  await runMigrations(config.db.directUrl);
  logger.info({ ms: Math.round(performance.now() - startedAt) }, 'migrations applied');
} catch (error) {
  logger.error({ err: error }, 'migrations failed');
  process.exitCode = 1;
}
