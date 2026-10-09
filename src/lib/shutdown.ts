import 'server-only';
import { closeDb } from './db';
import { closeQueues } from './queue';
import { closeRedis } from './redis';

/** Releases every pool and connection, for processes that exit on their own (worker, tests). */
export async function closeConnections(): Promise<void> {
  await Promise.all([closeDb(), closeQueues()]);
  await closeRedis();
}
