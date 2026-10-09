import type { FreightMethodCode } from './constants';
import type { FreightDestination, FreightOption } from './freight.types';

export interface CartLine {
  variantId: number;
  productSlug: string;
  productName: string;
  optionName: string | null;
  optionValue: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  /** Units that can still be bought (on hand minus reserved). */
  available: number;
  isBulky: boolean;
  weightGrams: number;
  /** When the line was first added; lines keep that order. */
  addedAt: number;
}

export interface AppliedCoupon {
  code: string;
  message: string;
}

export interface CartTotals {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  /** Null until a CEP and an animal are chosen. */
  freightCents: number | null;
  totalCents: number;
}

export interface CartView {
  lines: CartLine[];
  totals: CartTotals;
  coupon: AppliedCoupon | null;
  destination: FreightDestination | null;
  /** The CEP as the customer typed it (digits), when a destination is set. */
  cep: string | null;
  freightOptions: FreightOption[];
  selectedFreight: FreightMethodCode | null;
}
