import 'server-only';
import type { Result } from 'ioredis';
import { cacheKey } from './cache';
import { logger } from './logger';
import { redis } from './redis';

export interface RateLimitPolicy {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

export const RATE_LIMITS = {
  search: { limit: 40, windowMs: 10 * SECOND_MS },
  freight: { limit: 30, windowMs: MINUTE_MS },
  cart: { limit: 60, windowMs: MINUTE_MS },
  checkout: { limit: 10, windowMs: MINUTE_MS },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window counter: the current window's count plus the previous window's count weighted
 * by how much of it still overlaps. Smooths the 2× burst a plain fixed window allows at its
 * edges, in one atomic round trip and two small keys per client.
 */
const SLIDING_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1] * 2) end
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
return math.floor(previous * tonumber(ARGV[2]) + current)
`;

declare module 'ioredis' {
  interface RedisCommander<Context> {
    slidingWindow(
      currentKey: string,
      previousKey: string,
      windowMs: number,
      previousWeight: number,
    ): Result<number, Context>;
  }
}

redis.defineCommand('slidingWindow', { numberOfKeys: 2, lua: SLIDING_WINDOW_SCRIPT });

/** Counts a hit for `clientKey` against the named policy. Fails open if Redis is unavailable. */
export async function consumeRateLimit(
  name: RateLimitName,
  clientKey: string,
  now = Date.now(),
): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_LIMITS[name];
  const window = Math.floor(now / windowMs);
  const elapsedInWindow = (now % windowMs) / windowMs;
  try {
    const estimated = await redis.slidingWindow(
      cacheKey('rl', name, clientKey, window),
      cacheKey('rl', name, clientKey, window - 1),
      windowMs,
      1 - elapsedInWindow,
    );
    return {
      allowed: estimated <= limit,
      remaining: Math.max(0, limit - estimated),
      retryAfterSeconds: Math.ceil(((1 - elapsedInWindow) * windowMs) / SECOND_MS),
    };
  } catch (error) {
    logger.warn({ err: error, name }, 'rate limiter unavailable; allowing request');
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}
