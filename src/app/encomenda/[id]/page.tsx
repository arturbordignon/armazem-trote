import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadOrderConfirmation } from '@/controllers/cart.controller';
import { OrderTelegram } from '@/components/order/OrderTelegram';
import { PageFallback } from '@/components/ui/PageFallback';

export const metadata: Metadata = { title: 'Encomenda confirmada', robots: { index: false } };

/** The order's telegram, addressed by its unguessable public id. */
export default function OrderPage({ params }: PageProps<'/encomenda/[id]'>) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<'/encomenda/[id]'>, 'params'>) {
  return <OrderTelegram order={await loadOrderConfirmation((await params).id)} />;
}
