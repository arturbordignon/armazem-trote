import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DATABASE_URL_DIRECT: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_PREPARED_STATEMENTS: z.stringbool().default(true),
  DATABASE_LOG_QUERIES: z.stringbool().default(false),

  REDIS_URL: z.url({ protocol: /^rediss?$/ }),

  CART_COOKIE_SECRET: z.string().min(MIN_SECRET_LENGTH),

  /** Bearer token for the catalog maintenance API. Unset = the API is disabled. */
  ADMIN_API_TOKEN: z.string().min(MIN_SECRET_LENGTH).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export class InvalidEnvError extends Error {
  constructor(details: string) {
    super(`Invalid environment configuration:\n${details}`);
    this.name = 'InvalidEnvError';
  }
}

/** Parses and validates raw environment variables. Throws a readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) throw new InvalidEnvError(z.prettifyError(result.error));
  return result.data;
}
