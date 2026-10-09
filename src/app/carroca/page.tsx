import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadCart } from '@/controllers/cart.controller';
import { CartPage } from '@/components/cart/CartPage';
import { PageFallback } from '@/components/ui/PageFallback';

export const metadata: Metadata = { title: 'Sua carroça', robots: { index: false } };

/** Per-visitor and never cached: the cart streams in behind the static shell. */
export default function CartRoute() {
  return (
    <Suspense fallback={<PageFallback title="Sua carroça" />}>
      <Cart />
    </Suspense>
  );
}

async function Cart() {
  return <CartPage serverCart={await loadCart()} />;
}
