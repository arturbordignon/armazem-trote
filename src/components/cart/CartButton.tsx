'use client';

import { useEffect } from 'react';
import type { CartView } from '@/models/cart.types';
import { hydrateCart, openDrawer, useCartState } from './cart-store';
import styles from './CartButton.module.css';

/**
 * "Carroça" with the item count. Rendered with the server's cart (streamed in per request) and
 * seeds the client cart store with it; before that arrives it shows a placeholder count.
 */
export function CartButton({ initialCart }: { initialCart: CartView | null }) {
  const { cart, hydrated } = useCartState();

  useEffect(() => {
    if (initialCart) hydrateCart(initialCart);
  }, [initialCart]);

  const count = hydrated ? cart.totals.itemCount : initialCart?.totals.itemCount;
  return (
    <button
      type="button"
      className={styles.button}
      onClick={openDrawer}
      aria-label={`Abrir carroça, ${count ?? 0} itens`}
    >
      <svg
        width="24"
        height="19"
        viewBox="0 0 30 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path d="M2 5h20v9H2z" />
        <path d="M22 9h6" />
        <circle cx="8" cy="18" r="4" />
        <path d="M8 14v8M4 18h8" />
      </svg>
      <span>Carroça</span>
      <span className={styles.count}>{count ?? '·'}</span>
    </button>
  );
}
