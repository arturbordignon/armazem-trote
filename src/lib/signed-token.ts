import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * `value.signature` tokens (HMAC-SHA256). The guest-cart cookie carries only a random cart id;
 * signing it means nobody can point their cookie at someone else's cart by guessing ids.
 */
export function sign(value: string, secret: string): string {
  return `${value}.${mac(value, secret)}`;
}

/** The original value if the signature checks out, otherwise null. */
export function unsign(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(value, secret));
  return given.length === expected.length && timingSafeEqual(given, expected) ? value : null;
}

function mac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
