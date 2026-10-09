'use server';

import type { PlacedOrder } from '@/models/order.types';
import { placeOrder } from '@/services/checkout.service';
import { placeOrderSchema } from '@/validators/checkout';
import { type ActionResult, defineAction } from './actions';
import { revalidateCatalog } from './cache-tags';
import { clearCartCookie, readCartId } from './cart-session';

const place = defineAction(
  'checkout.place-order',
  placeOrderSchema,
  { rateLimit: 'checkout' },
  async (input) => {
    const result = await placeOrder(await readCartId(), input);
    // Reserved stock changed what product pages show.
    revalidateCatalog(result.restockedSlugs, 'stock');
    await clearCartCookie();
    return result.order;
  },
);

/** "Confirmar encomenda". Safe to retry with the same idempotency key. */
export async function placeOrderAction(input: unknown): Promise<ActionResult<PlacedOrder>> {
  return place(input);
}
