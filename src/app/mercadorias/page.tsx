import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadListingPage } from '@/controllers/catalog.controller';
import { ListingFallback } from '@/components/catalog/ListingFallback';
import { ListingView } from '@/components/catalog/ListingView';
import { paramsToRecord } from '@/validators/common';

export const metadata: Metadata = { title: 'Todas as mercadorias' };

/** Every product, or a combination of sections (`?secao=a&secao=b`). Filters live in the URL. */
export default function AllProductsPage({ searchParams }: PageProps<'/mercadorias'>) {
  return (
    <Suspense fallback={<ListingFallback title="Todas as mercadorias" />}>
      <Listing searchParams={searchParams} />
    </Suspense>
  );
}

async function Listing({ searchParams }: Pick<PageProps<'/mercadorias'>, 'searchParams'>) {
  const page = await loadListingPage(paramsToRecord(await searchParams));
  return <ListingView page={page} />;
}
