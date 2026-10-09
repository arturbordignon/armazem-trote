'use server';

import type { CartView } from '@/models/cart.types';
import { EMPTY_CART } from '@/models/constants';
import * as cartService from '@/services/cart.service';
import {
  addToCartSchema,
  couponSchema,
  destinationSchema,
  freightChoiceSchema,
  updateCartLineSchema,
} from '@/validators/cart';
import { type ActionResult, defineAction } from './actions';
import { readCartId, writeCartId } from './cart-session';

// Every action returns the whole recomputed cart: the client applies its optimistic guess
// immediately, then reconciles with this authoritative copy.

const add = defineAction('cart.add', addToCartSchema, { rateLimit: 'cart' }, async (input) => {
  const existing = await readCartId();
  const { cartId, cart } = await cartService.addToCart(existing, input.variantId, input.quantity);
  if (cartId !== existing) await writeCartId(cartId);
  return cart;
});

const update = defineAction(
  'cart.update',
  updateCartLineSchema,
  { rateLimit: 'cart' },
  async (input) => {
    const cartId = await readCartId();
    return cartId
      ? cartService.updateCartLine(cartId, input.variantId, input.quantity)
      : EMPTY_CART;
  },
);

const coupon = defineAction('cart.coupon', couponSchema, { rateLimit: 'cart' }, async (input) => {
  const cartId = await readCartId();
  return cartId ? cartService.applyCoupon(cartId, input.code) : EMPTY_CART;
});

const destination = defineAction(
  'cart.destination',
  destinationSchema,
  { rateLimit: 'freight' },
  async (input) => {
    const cartId = await readCartId();
    return cartId ? cartService.setDestination(cartId, input.cep) : EMPTY_CART;
  },
);

const freight = defineAction(
  'cart.freight',
  freightChoiceSchema,
  { rateLimit: 'cart' },
  async (input) => {
    const cartId = await readCartId();
    return cartId ? cartService.chooseFreight(cartId, input.method) : EMPTY_CART;
  },
);

export async function addToCartAction(input: unknown): Promise<ActionResult<CartView>> {
  return add(input);
}

export async function updateCartLineAction(input: unknown): Promise<ActionResult<CartView>> {
  return update(input);
}

export async function applyCouponAction(input: unknown): Promise<ActionResult<CartView>> {
  return coupon(input);
}

export async function setDestinationAction(input: unknown): Promise<ActionResult<CartView>> {
  return destination(input);
}

export async function chooseFreightAction(input: unknown): Promise<ActionResult<CartView>> {
  return freight(input);
}
