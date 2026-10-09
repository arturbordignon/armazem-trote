// Cart arithmetic. Pure and integer-only: every amount is in cents, and every total the
// customer sees is computed here, on the server.
import type { CouponKind } from '@/models/constants';
import type { CartLine, CartTotals } from '@/models/cart.types';

const PERCENT = 100;

export interface CouponTerms {
  code: string;
  kind: CouponKind;
  percentOff: number | null;
  amountOffCents: number | null;
  message: string;
}

/** Discount on goods (never freight); can't exceed the subtotal. Rounds to the nearest cent. */
export function discountCents(subtotalCents: number, coupon: CouponTerms | null): number {
  if (!coupon) return 0;
  switch (coupon.kind) {
    case 'percent_off':
      return Math.min(
        subtotalCents,
        Math.round((subtotalCents * (coupon.percentOff ?? 0)) / PERCENT),
      );
    case 'amount_off':
      return Math.min(subtotalCents, coupon.amountOffCents ?? 0);
    case 'free_freight':
      return 0;
  }
}

export function waivesFreight(coupon: CouponTerms | null): boolean {
  return coupon?.kind === 'free_freight';
}

export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

export function computeTotals(
  lines: readonly Pick<CartLine, 'unitPriceCents' | 'quantity'>[],
  coupon: CouponTerms | null,
  freightCents: number | null,
): CartTotals {
  const subtotalCents = lines.reduce(
    (sum, l) => sum + lineTotalCents(l.unitPriceCents, l.quantity),
    0,
  );
  const discount = discountCents(subtotalCents, coupon);
  return {
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotalCents,
    discountCents: discount,
    freightCents,
    totalCents: subtotalCents - discount + (freightCents ?? 0),
  };
}

/** What freight depends on: total weight, and whether any line needs the cart. */
export function shipmentOf(
  lines: readonly Pick<CartLine, 'weightGrams' | 'quantity' | 'isBulky'>[],
) {
  return {
    weightGrams: lines.reduce((sum, l) => sum + l.weightGrams * l.quantity, 0),
    hasBulkyItems: lines.some((l) => l.isBulky),
  };
}
