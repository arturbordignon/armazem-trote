import 'server-only';
import type { Result } from 'ioredis';
import { redis } from '@/lib/redis';
import { type FreightMethodCode, MAX_LINE_QUANTITY } from '@/models/constants';

// Guest carts live in one Redis hash per cart:
//   q:<variantId> → quantity        t:<variantId> → first-added timestamp (keeps line order)
//   coupon, cep, freight             createdAt
// Every write refreshes the TTL, so abandoned carts clean themselves up.

const CART_TTL_SECONDS = 30 * 24 * 60 * 60;
const KEY_PREFIX = 'trote:v1:cart';
const QUANTITY_FIELD = 'q:';
const ADDED_AT_FIELD = 't:';

const cartKey = (cartId: string) => `${KEY_PREFIX}:${cartId}`;

/**
 * Adds to (mode "add") or replaces (mode "set") a line's quantity atomically, clamped to
 * [0, max]; 0 removes the line. A plain read-modify-write would lose updates when two tabs
 * change the same cart at once.
 */
const ADJUST_LINE_SCRIPT = `
local quantityField = 'q:' .. ARGV[1]
local addedField = 't:' .. ARGV[1]
local amount = tonumber(ARGV[2])
local quantity = amount
if ARGV[3] == 'add' then
  quantity = tonumber(redis.call('HGET', KEYS[1], quantityField) or '0') + amount
end
quantity = math.min(quantity, tonumber(ARGV[4]))
if quantity <= 0 then
  redis.call('HDEL', KEYS[1], quantityField, addedField)
  quantity = 0
else
  redis.call('HSET', KEYS[1], quantityField, quantity)
  redis.call('HSETNX', KEYS[1], addedField, ARGV[5])
  redis.call('HSETNX', KEYS[1], 'createdAt', ARGV[5])
end
redis.call('EXPIRE', KEYS[1], ARGV[6])
return quantity
`;

declare module 'ioredis' {
  interface RedisCommander<Context> {
    adjustCartLine(
      key: string,
      variantId: number,
      amount: number,
      mode: 'add' | 'set',
      max: number,
      now: number,
      ttlSeconds: number,
    ): Result<number, Context>;
  }
}

redis.defineCommand('adjustCartLine', { numberOfKeys: 1, lua: ADJUST_LINE_SCRIPT });

export interface StoredCartLine {
  variantId: number;
  quantity: number;
  addedAt: number;
}

export interface StoredCart {
  lines: StoredCartLine[];
  couponCode: string | null;
  cep: string | null;
  freight: FreightMethodCode | null;
  createdAt: number | null;
}

export async function readCart(cartId: string): Promise<StoredCart> {
  const hash = await redis.hgetall(cartKey(cartId));
  const lines: StoredCartLine[] = [];
  for (const [field, value] of Object.entries(hash)) {
    if (!field.startsWith(QUANTITY_FIELD)) continue;
    const variantId = Number(field.slice(QUANTITY_FIELD.length));
    lines.push({
      variantId,
      quantity: Number(value),
      addedAt: Number(hash[`${ADDED_AT_FIELD}${variantId}`] ?? 0),
    });
  }
  lines.sort((a, b) => a.addedAt - b.addedAt || a.variantId - b.variantId);
  return {
    lines,
    couponCode: hash.coupon ?? null,
    cep: hash.cep ?? null,
    freight: (hash.freight as FreightMethodCode | undefined) ?? null,
    createdAt: hash.createdAt ? Number(hash.createdAt) : null,
  };
}

export function adjustLine(
  cartId: string,
  variantId: number,
  amount: number,
  mode: 'add' | 'set',
  now = Date.now(),
): Promise<number> {
  return redis.adjustCartLine(
    cartKey(cartId),
    variantId,
    amount,
    mode,
    MAX_LINE_QUANTITY,
    now,
    CART_TTL_SECONDS,
  );
}

type CartSetting = 'coupon' | 'cep' | 'freight';

/** Sets (or, with null, clears) cart-level settings in one round trip. */
export async function updateSettings(
  cartId: string,
  settings: Partial<Record<CartSetting, string | null>>,
): Promise<void> {
  const key = cartKey(cartId);
  const entries = Object.entries(settings);
  const toSet = entries.filter((e): e is [string, string] => e[1] !== null && e[1] !== undefined);
  const toClear = entries.filter(([, value]) => value === null).map(([field]) => field);
  const multi = redis.multi();
  if (toSet.length > 0) multi.hset(key, Object.fromEntries(toSet));
  if (toClear.length > 0) multi.hdel(key, ...toClear);
  multi.hsetnx(key, 'createdAt', String(Date.now()));
  multi.expire(key, CART_TTL_SECONDS);
  await multi.exec();
}

export async function deleteCart(cartId: string): Promise<void> {
  await redis.unlink(cartKey(cartId));
}
