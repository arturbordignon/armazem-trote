import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadListingPage, loadSectionSlugs } from '@/controllers/catalog.controller';
import { ListingFallback } from '@/components/catalog/ListingFallback';
import { ListingView } from '@/components/catalog/ListingView';
import { paramsToRecord } from '@/validators/common';

export function generateStaticParams() {
  return loadSectionSlugs();
}

export async function generateMetadata({ params }: PageProps<'/secao/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadListingPage({}, slug);
  return { title: page.title, description: `${page.title}: mercadorias do Armazém Trote & Cia.` };
}

/** One section. The unfiltered first page is prerendered; filters stream in behind the skeleton. */
export default function SectionPage({ params, searchParams }: PageProps<'/secao/[slug]'>) {
  return (
    <Suspense fallback={<ListingFallback />}>
      <Listing params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Listing({ params, searchParams }: PageProps<'/secao/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = await loadListingPage(paramsToRecord(query), slug);
  return <ListingView page={page} />;
}
