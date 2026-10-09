import 'server-only';
import { parseEnv } from './env';

const env = parseEnv(process.env);

/** Validated, structured application config. Importing this module fails fast on bad env. */
export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  log: {
    level: env.LOG_LEVEL,
  },
  db: {
    url: env.DATABASE_URL,
    directUrl: env.DATABASE_URL_DIRECT ?? env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    preparedStatements: env.DATABASE_PREPARED_STATEMENTS,
    logQueries: env.DATABASE_LOG_QUERIES,
  },
  redis: {
    url: env.REDIS_URL,
  },
  cart: {
    cookieSecret: env.CART_COOKIE_SECRET,
  },
  admin: {
    apiToken: env.ADMIN_API_TOKEN ?? null,
  },
} as const;

export type AppConfig = typeof config;
