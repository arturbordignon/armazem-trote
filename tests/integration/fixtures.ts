import { generateCatalog } from '../../db/seed/generator';
import { seedDatabase } from '../../db/seed/seed';
import { redis } from '@/lib/redis';
import { currentRequestContext, runWithRequestContext } from '@/lib/request-context';
import { connectTestDatabase } from './test-database';

export const REFERENCE_DATE = new Date('2026-10-01T12:00:00Z');

/** Fresh deterministic catalog in the test database and an empty test Redis. */
export async function resetCatalog(productCount = 400): Promise<void> {
  const { db, close } = connectTestDatabase();
  try {
    await seedDatabase(
      db,
      generateCatalog({ productCount, seed: 1887, referenceDate: REFERENCE_DATE }),
    );
  } finally {
    await close();
  }
  await redis.flushdb();
}

/** Runs `work` as if it were one request and reports how many SQL statements it issued. */
export async function countingQueries<T>(
  work: () => Promise<T>,
): Promise<{ result: T; queries: number }> {
  return runWithRequestContext('test', async () => {
    const result = await work();
    return { result, queries: currentRequestContext()?.queryCount ?? 0 };
  });
}
