import 'server-only';
import { ConflictError, NotFoundError } from '@/lib/errors';
import * as catalogRepository from '@/repositories/catalog.repository';
import { inTransaction } from '@/repositories/transaction';
import type { ProductUpdate } from '@/validators/admin';
import { type CatalogChange, invalidateProducts } from './catalog.service';

/**
 * Reprices and/or restocks a product atomically, then drops every cache entry that showed the
 * old values. Throwing inside the transaction rolls back everything written so far.
 */
export async function updateProduct(slug: string, update: ProductUpdate): Promise<CatalogChange> {
  const { pricing } = update;
  if (pricing && pricing.compareAtCents !== null && pricing.compareAtCents <= pricing.priceCents) {
    throw new ConflictError('O preço "de" precisa ser maior que o preço atual.');
  }
  await inTransaction(async (tx) => {
    if (pricing) {
      const found = await catalogRepository.updatePricing(
        slug,
        pricing.priceCents,
        pricing.compareAtCents,
        tx,
      );
      if (!found) throw new NotFoundError();
    }
    for (const { sku, onHand } of update.stock ?? []) {
      const result = await catalogRepository.setStock(slug, sku, onHand, tx);
      if (result.status === 'not_found')
        throw new NotFoundError(`SKU "${sku}" não é de "${slug}".`);
      if (result.status === 'below_reserved') {
        throw new ConflictError(
          `Há mais unidades de ${sku} reservadas por encomendas do que isso.`,
        );
      }
    }
  });
  const change: CatalogChange = update.pricing ? 'content' : 'stock';
  await invalidateProducts([slug], change);
  return change;
}
