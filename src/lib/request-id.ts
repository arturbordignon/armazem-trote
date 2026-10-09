export const REQUEST_ID_HEADER = 'x-request-id';

// Accept ids from a trusted upstream (load balancer, CDN) only if they look like ids.
const VALID_REQUEST_ID = /^[\w-]{8,64}$/;

/** The incoming request id when it is well-formed, otherwise a fresh one. */
export function requestIdFrom(headers: Headers): string {
  const incoming = headers.get(REQUEST_ID_HEADER);
  return incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
}
