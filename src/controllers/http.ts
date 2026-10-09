import 'server-only';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type * as z from 'zod/mini';
import { AppError, RateLimitedError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { type RateLimitName, consumeRateLimit } from '@/lib/rate-limit';
import { currentRequestContext, runWithRequestContext } from '@/lib/request-context';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/request-id';

const HTTP_NOT_MODIFIED = 304;
const HTTP_INTERNAL_ERROR = 500;
/** More statements than this in one request is almost always an N+1 loop. */
const QUERY_COUNT_WARNING = 10;

type RouteHandler<Context> = (request: NextRequest, context: Context) => Promise<Response>;

/**
 * Wraps a route handler with the cross-cutting concerns every endpoint needs: request id and
 * per-request context, centralized error → response mapping, and one structured access log
 * line with status, timing and SQL statement count.
 */
export function handleRoute<Context>(
  route: string,
  handler: RouteHandler<Context>,
): RouteHandler<Context> {
  return (request, context) => {
    const requestId = requestIdFrom(request.headers);
    return runWithRequestContext(requestId, async () => {
      const startedAt = performance.now();
      let response: Response;
      try {
        response = await handler(request, context);
      } catch (error) {
        response = errorResponse(error);
      }
      response.headers.set(REQUEST_ID_HEADER, requestId);
      logAccess(route, request.method, response.status, performance.now() - startedAt);
      return response;
    });
  };
}

function logAccess(route: string, method: string, status: number, elapsedMs: number): void {
  const queries = currentRequestContext()?.queryCount ?? 0;
  const line = { route, method, status, ms: Math.round(elapsedMs), queries };
  if (queries > QUERY_COUNT_WARNING) logger.warn(line, 'request issued many SQL statements (N+1?)');
  else logger.info(line, 'request');
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
}

/** The single place where errors become HTTP responses. Unknown errors never leak details. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError ? { fieldErrors: error.fieldErrors } : {}),
      },
    };
    const headers: HeadersInit =
      error instanceof RateLimitedError ? { 'Retry-After': String(error.retryAfterSeconds) } : {};
    return Response.json(body, { status: error.status, headers });
  }
  logger.error({ err: error }, 'unhandled error');
  const body: ErrorBody = {
    error: { code: 'internal', message: 'O armazém tropeçou. Tente de novo em instantes.' },
  };
  return Response.json(body, { status: HTTP_INTERNAL_ERROR });
}

/**
 * Parses input with a shared zod schema; failures become a ValidationError whose field errors
 * are keyed by dotted path ("address.cep"), so forms can show each message under its field.
 */
export function parseInput<Schema extends z.ZodMiniType>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join('.') || '_';
    (fieldErrors[field] ??= []).push(issue.message);
  }
  throw new ValidationError(result.error.issues[0]?.message ?? 'Dados inválidos.', fieldErrors);
}

/** Best-effort client address behind proxies/CDNs (first hop of X-Forwarded-For). */
export function clientAddress(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
  );
}

export async function enforceRateLimit(name: RateLimitName, headers: Headers): Promise<void> {
  const result = await consumeRateLimit(name, clientAddress(headers));
  if (!result.allowed) throw new RateLimitedError(result.retryAfterSeconds);
}

export interface PublicCachePolicy {
  /** Seconds browsers may reuse the response. */
  maxAge: number;
  /** Seconds shared caches (CDN) may reuse it. */
  sMaxAge: number;
  /** Seconds a CDN may keep serving it stale while refetching in the background. */
  staleWhileRevalidate: number;
}

/**
 * JSON for public GET endpoints, ready for a CDN: Cache-Control plus a strong ETag of the body,
 * answering conditional requests with an empty 304 when the client's copy is current.
 */
export function cachedJson(request: Request, body: unknown, policy: PublicCachePolicy): Response {
  const payload = JSON.stringify(body);
  const etag = `"${createHash('sha1').update(payload).digest('base64url')}"`;
  const headers = {
    'Cache-Control': `public, max-age=${policy.maxAge}, s-maxage=${policy.sMaxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`,
    ETag: etag,
    Vary: 'Accept-Encoding',
  };
  if (ifNoneMatchIncludes(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: HTTP_NOT_MODIFIED, headers });
  }
  return new Response(payload, { headers: { ...headers, 'Content-Type': 'application/json' } });
}

function ifNoneMatchIncludes(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header.split(',').some((tag) => {
    const value = tag.trim();
    return value === '*' || value === etag || value === `W/${etag}`;
  });
}
