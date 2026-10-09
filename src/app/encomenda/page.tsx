import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadCheckoutPage } from '@/controllers/cart.controller';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';
import { PageFallback } from '@/components/ui/PageFallback';

export const metadata: Metadata = { title: 'Acertar a encomenda', robots: { index: false } };

/** Checkout: per-visitor, never cached; an empty cart is sent back to the cart page. */
export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageFallback title="Acertar a encomenda" />}>
      <Checkout />
    </Suspense>
  );
}

async function Checkout() {
  return <CheckoutFlow serverCart={await loadCheckoutPage()} />;
}
