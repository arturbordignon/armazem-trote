import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadSearchPage } from '@/controllers/catalog.controller';
import { ListingFallback } from '@/components/catalog/ListingFallback';
import { SearchResults } from '@/components/catalog/SearchResults';
import { paramsToRecord } from '@/validators/common';

export const metadata: Metadata = { title: 'Busca', robots: { index: false } };

/** `/busca?q=…` — full-text search with a typo-tolerant fallback, cached per query and page. */
export default function SearchPage({ searchParams }: PageProps<'/busca'>) {
  return (
    <Suspense fallback={<ListingFallback />}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: Pick<PageProps<'/busca'>, 'searchParams'>) {
  const page = await loadSearchPage(paramsToRecord(await searchParams));
  return <SearchResults page={page} />;
}
