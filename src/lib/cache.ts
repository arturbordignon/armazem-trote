import 'server-only';
import { logger } from './logger';
import { redis } from './redis';

/** Bump when a cached payload changes shape, so old entries are never read back. */
const KEY_PREFIX = 'trote:v1';

export function cacheKey(...parts: readonly (string | number)[]): string {
  return [KEY_PREFIX, ...parts].join(':');
}

// Concurrent misses for the same key share one load instead of stampeding the database.
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Cache-aside read: return the cached value, or load it, store it for `ttlSeconds` and return
 * it. Redis is an accelerator, never a dependency: if it is down, every call simply loads.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await readEntry<T>(key);
  if (hit !== undefined) return hit;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const loading = load()
    .then(async (value) => {
      await writeEntry(key, value, ttlSeconds);
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, loading);
  return loading;
}

export async function invalidate(...keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.unlink(...keys);
  } catch (error) {
    logger.warn({ err: error, keys }, 'cache invalidation failed');
  }
}

/**
 * Generations version whole families of keys (every listing, every search…). Bumping one
 * orphans all keys built with the old number at once; they expire on their own TTL.
 */
export async function currentGeneration(name: string): Promise<number> {
  try {
    return Number((await redis.get(cacheKey('gen', name))) ?? 0);
  } catch (error) {
    logger.warn({ err: error, name }, 'cache generation read failed');
    return 0;
  }
}

export async function bumpGeneration(name: string): Promise<void> {
  try {
    await redis.incr(cacheKey('gen', name));
  } catch (error) {
    logger.warn({ err: error, name }, 'cache generation bump failed');
  }
}

async function readEntry<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await redis.get(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch (error) {
    logger.warn({ err: error, key }, 'cache read failed; loading from source');
    return undefined;
  }
}

async function writeEntry(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.warn({ err: error, key }, 'cache write failed');
  }
}
