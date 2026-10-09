import 'server-only';
import { redis } from '@/lib/redis';
import { pingDatabase } from '@/repositories/health.repository';

const CHECK_TIMEOUT_MS = 2_000;

export interface DependencyCheck {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: { postgres: DependencyCheck; redis: DependencyCheck };
}

/** Pings every backing service in parallel; a slow dependency counts as down after a timeout. */
export async function getHealth(): Promise<HealthReport> {
  const [postgres, redisCheck] = await Promise.all([
    timed(pingDatabase),
    timed(async () => {
      await redis.ping();
    }),
  ]);
  return {
    status: postgres.ok && redisCheck.ok ? 'ok' : 'degraded',
    checks: { postgres, redis: redisCheck },
  };
}

async function timed(check: () => Promise<void>): Promise<DependencyCheck> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  try {
    await Promise.race([check(), rejectAfter(CHECK_TIMEOUT_MS)]);
    return { ok: true, latencyMs: elapsed() };
  } catch (error) {
    return { ok: false, latencyMs: elapsed(), error: (error as Error).message };
  }
}

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref();
  });
}
