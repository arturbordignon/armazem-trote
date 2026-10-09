import { describe, expect, it } from 'vitest';
import { InvalidEnvError, parseEnv } from '@/lib/env';

const valid = {
  DATABASE_URL: 'postgres://trote:trote@localhost:5434/armazem',
  REDIS_URL: 'redis://localhost:6380',
  CART_COOKIE_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('applies defaults for optional settings', () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      DATABASE_POOL_MAX: 10,
      DATABASE_PREPARED_STATEMENTS: true,
      DATABASE_LOG_QUERIES: false,
    });
  });

  it('coerces numbers and booleans from strings', () => {
    const env = parseEnv({
      ...valid,
      DATABASE_POOL_MAX: '25',
      DATABASE_PREPARED_STATEMENTS: 'false',
      DATABASE_LOG_QUERIES: '1',
    });
    expect(env.DATABASE_POOL_MAX).toBe(25);
    expect(env.DATABASE_PREPARED_STATEMENTS).toBe(false);
    expect(env.DATABASE_LOG_QUERIES).toBe(true);
  });

  it('reports every problem at once', () => {
    const attempt = () =>
      parseEnv({
        DATABASE_URL: 'mysql://nope',
        REDIS_URL: 'redis://ok',
        CART_COOKIE_SECRET: 'short',
      });
    expect(attempt).toThrow(InvalidEnvError);
    expect(attempt).toThrow(/DATABASE_URL[\s\S]*CART_COOKIE_SECRET/);
  });

  it('rejects a missing database url', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });
});
