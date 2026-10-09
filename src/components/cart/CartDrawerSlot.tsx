'use client';

import dynamic from 'next/dynamic';
import { useCartState } from './cart-store';

// The drawer (lines, steppers, focus trap) is only fetched the first time it opens.
const CartDrawer = dynamic(() => import('./CartDrawer').then((module) => module.CartDrawer));

export function CartDrawerSlot() {
  const { drawerOpen } = useCartState();
  return drawerOpen ? <CartDrawer /> : null;
}
