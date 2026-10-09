import 'server-only';
import { redirect, notFound } from 'next/navigation';
import type { CartView } from '@/models/cart.types';
import type { OrderConfirmation } from '@/models/order.types';
import { getCart } from '@/services/cart.service';
import { getOrderConfirmation } from '@/services/order.service';
import { uuidSchema } from '@/validators/common';
import { readCartId } from './cart-session';

/** The visitor's cart (header badge, drawer and cart page). Per-request: never cached. */
export async function loadCart(): Promise<CartView> {
  return getCart(await readCartId());
}

/** Checkout needs something to check out; an empty cart goes back to the cart page. */
export async function loadCheckoutPage(): Promise<CartView> {
  const cart = await loadCart();
  if (cart.lines.length === 0) redirect('/carroca');
  return cart;
}

export async function loadOrderConfirmation(publicId: string): Promise<OrderConfirmation> {
  const parsed = uuidSchema.safeParse(publicId);
  const order = parsed.success ? await getOrderConfirmation(parsed.data) : null;
  if (!order) notFound();
  return order;
}
