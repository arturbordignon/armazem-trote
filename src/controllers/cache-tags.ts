import 'server-only';
import { revalidateTag } from 'next/cache';
import type { CatalogChange } from '@/services/catalog.service';

/** Every page built from catalog data: home, listings, search, product pages, navigation. */
export const CATALOG_TAG = 'catalog';

export function productTag(slug: string): string {
  return `product:${slug}`;
}

/**
 * Mirrors a catalog change into Next's render cache (services already cleared Redis). Stock
 * shows only on product pages; prices and names appear everywhere. Stale-while-revalidate:
 * visitors keep getting the old page instantly while the new one renders in the background.
 */
export function revalidateCatalog(slugs: readonly string[], change: CatalogChange): void {
  for (const slug of slugs) revalidateTag(productTag(slug), 'max');
  if (change === 'content') revalidateTag(CATALOG_TAG, 'max');
}
