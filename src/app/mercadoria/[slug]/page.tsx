import type { Metadata } from 'next';
import { loadPrerenderedProductSlugs, loadProductPage } from '@/controllers/catalog.controller';
import { ProductView } from '@/components/product/ProductView';

/**
 * A navigation here waits for the (cached) product rather than flashing a placeholder: the
 * page is static per product, and streaming it behind a fallback caused a layout shift.
 */
export const instant = false;

/** Best sellers are built ahead of time; any other product is rendered once, then cached. */
export function generateStaticParams() {
  return loadPrerenderedProductSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<'/mercadoria/[slug]'>): Promise<Metadata> {
  const { product } = await loadProductPage((await params).slug);
  return { title: product.name, description: product.description };
}

/**
 * Awaited outside any Suspense boundary on purpose: the page is fully static per product, and a
 * fallback here would stream the content out of order, letting the footer flash into view and
 * jump (a layout shift) on slow connections. Unlisted products render on their first visit.
 */
export default async function ProductPage({ params }: PageProps<'/mercadoria/[slug]'>) {
  return <ProductView page={await loadProductPage((await params).slug)} />;
}
