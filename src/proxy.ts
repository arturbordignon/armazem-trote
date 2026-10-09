import { type NextRequest, NextResponse } from 'next/server';
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/request-id';

/**
 * Stamps every request with an id, visible to route handlers and server actions (request
 * header) and to the client and access logs (response header), so a log line can be traced
 * back to the request that produced it.
 */
export function proxy(request: NextRequest): NextResponse {
  const requestId = requestIdFrom(request.headers);
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Everything except build assets and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
