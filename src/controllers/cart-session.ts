import 'server-only';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { sign, unsign } from '@/lib/signed-token';

const CART_COOKIE = 'carroca';
const CART_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** The guest cart id from the signed cookie, or null if absent or tampered with. */
export async function readCartId(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? unsign(token, config.cart.cookieSecret) : null;
}

export async function writeCartId(cartId: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, sign(cartId, config.cart.cookieSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
