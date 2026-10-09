import { useEffect } from 'react';
import type { CartView } from '@/models/cart.types';
import { hydrateCart, useCartState } from './cart-store';

/**
 * The cart for a page that also received it from the server: the server copy renders first
 * (and seeds the store); from then on the store, with its optimistic edits, is the source.
 */
export function useCart(serverCart: CartView): CartView {
  const { cart, hydrated } = useCartState();
  useEffect(() => hydrateCart(serverCart), [serverCart]);
  return hydrated ? cart : serverCart;
}
