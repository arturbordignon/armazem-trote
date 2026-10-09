import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { type Executor, db } from '@/lib/db';
import { inventory, products, variants } from '@/models/catalog.schema';
import { cartItems, carts, coupons } from '@/models/commerce.schema';

/** Catalog facts for the variants in a cart: one query whatever the number of lines. */
export function findCartVariants(variantIds: readonly number[]) {
  if (variantIds.length === 0) return Promise.resolve([]);
  return db
    .select({
      variantId: variants.id,
      optionValue: variants.optionValue,
      productId: products.id,
      productSlug: products.slug,
      productName: products.name,
      optionName: products.optionName,
      unitPriceCents: products.priceCents,
      isBulky: products.isBulky,
      weightGrams: products.weightGrams,
      available: sql<number>`${inventory.onHand} - ${inventory.reserved}`.mapWith(Number),
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(inventory, eq(inventory.variantId, variants.id))
    .where(and(inArray(variants.id, [...variantIds]), eq(products.isActive, true)));
}

export type CartVariantRow = Awaited<ReturnType<typeof findCartVariants>>[number];

export async function findActiveCoupon(code: string) {
  const [row] = await db
    .select({
      code: coupons.code,
      kind: coupons.kind,
      percentOff: coupons.percentOff,
      amountOffCents: coupons.amountOffCents,
      message: coupons.message,
    })
    .from(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.isActive, true)))
    .limit(1);
  return row;
}

/**
 * Writes the cart, as it was when ordered, inside the order transaction. Returns false if this
 * cart was already converted (a second tab, a double submit with a fresh key).
 */
export async function insertCartSnapshot(
  tx: Executor,
  cart: { id: string; createdAt: Date; lines: readonly { variantId: number; quantity: number }[] },
): Promise<boolean> {
  const inserted = await tx
    .insert(carts)
    .values({ id: cart.id, createdAt: cart.createdAt })
    .onConflictDoNothing()
    .returning({ id: carts.id });
  if (inserted.length === 0) return false;
  await tx.insert(cartItems).values(
    cart.lines.map((line) => ({
      cartId: cart.id,
      variantId: line.variantId,
      quantity: line.quantity,
    })),
  );
  return true;
}
