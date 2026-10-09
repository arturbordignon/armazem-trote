import 'server-only';
import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type * as z from 'zod/mini';
import { AppError, type ErrorCode, type FieldErrors, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { RateLimitName } from '@/lib/rate-limit';
import { currentRequestContext, runWithRequestContext } from '@/lib/request-context';
import { requestIdFrom } from '@/lib/request-id';
import { enforceRateLimit, parseInput } from './http';

/** What every server action resolves to. Expected failures are values, not exceptions. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: FieldErrors } };

interface ActionOptions {
  rateLimit?: RateLimitName;
}

/**
 * Builds a server action from a shared zod schema and a handler: rate limiting, validation,
 * request id + logging, and translation of application errors into an ActionResult the client
 * can render. Unexpected errors are logged and reported generically.
 */
export function defineAction<Schema extends z.ZodMiniType, Output>(
  name: string,
  schema: Schema,
  options: ActionOptions,
  handler: (input: z.infer<Schema>) => Promise<Output>,
): (raw: unknown) => Promise<ActionResult<Output>> {
  return async (raw) => {
    const requestHeaders = await headers();
    return runWithRequestContext(requestIdFrom(requestHeaders), async () => {
      const startedAt = performance.now();
      let result: ActionResult<Output>;
      try {
        if (options.rateLimit) await enforceRateLimit(options.rateLimit, requestHeaders);
        result = { ok: true, data: await handler(parseInput(schema, raw)) };
      } catch (error) {
        unstable_rethrow(error); // let redirect()/notFound() through
        result = { ok: false, error: toActionError(error) };
      }
      logger.info(
        {
          action: name,
          ok: result.ok,
          ...(result.ok ? {} : { code: result.error.code }),
          ms: Math.round(performance.now() - startedAt),
          queries: currentRequestContext()?.queryCount ?? 0,
        },
        'action',
      );
      return result;
    });
  };
}

function toActionError(error: unknown): Extract<ActionResult<never>, { ok: false }>['error'] {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
    };
  }
  logger.error({ err: error }, 'unhandled action error');
  return { code: 'internal', message: 'O armazém tropeçou. Tente de novo em instantes.' };
}
