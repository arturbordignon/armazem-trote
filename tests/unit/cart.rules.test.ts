import { describe, expect, it } from 'vitest';
import {
  type CouponTerms,
  computeTotals,
  discountCents,
  shipmentOf,
  waivesFreight,
} from '@/services/cart.rules';

const galinha10: CouponTerms = {
  code: 'GALINHA10',
  kind: 'percent_off',
  percentOff: 10,
  amountOffCents: null,
  message: '',
};
const trote: CouponTerms = {
  code: 'TROTE',
  kind: 'free_freight',
  percentOff: null,
  amountOffCents: null,
  message: '',
};
const fundacao: CouponTerms = {
  code: '1887',
  kind: 'amount_off',
  percentOff: null,
  amountOffCents: 1887,
  message: '',
};

// The design's sample cart: one lampião (R$ 89,90) and two sacks of coffee (R$ 119,00).
const lines = [
  { unitPriceCents: 8990, quantity: 1 },
  { unitPriceCents: 11900, quantity: 2 },
];

describe('computeTotals', () => {
  it('adds lines in integer cents', () => {
    expect(computeTotals(lines, null, null)).toEqual({
      itemCount: 3,
      subtotalCents: 32790,
      discountCents: 0,
      freightCents: null,
      totalCents: 32790,
    });
  });

  it('applies the discount to goods and adds freight on top', () => {
    expect(computeTotals(lines, galinha10, 1785)).toMatchObject({
      discountCents: 3279,
      freightCents: 1785,
      totalCents: 32790 - 3279 + 1785,
    });
  });

  it('handles an empty cart', () => {
    expect(computeTotals([], galinha10, null)).toMatchObject({
      itemCount: 0,
      subtotalCents: 0,
      totalCents: 0,
    });
  });
});

describe('discountCents', () => {
  it('rounds percentage discounts to the nearest cent', () => {
    expect(discountCents(1995, galinha10)).toBe(200); // 199.5 → 200
    expect(discountCents(1994, galinha10)).toBe(199);
  });

  it('never discounts more than the subtotal', () => {
    expect(discountCents(990, fundacao)).toBe(990);
    expect(discountCents(32790, fundacao)).toBe(1887);
  });

  it('gives no money off for free-freight coupons', () => {
    expect(discountCents(32790, trote)).toBe(0);
    expect(waivesFreight(trote)).toBe(true);
    expect(waivesFreight(galinha10)).toBe(false);
    expect(waivesFreight(null)).toBe(false);
  });
});

describe('shipmentOf', () => {
  it('sums weight per unit and flags bulky lines', () => {
    expect(
      shipmentOf([
        { weightGrams: 1200, quantity: 1, isBulky: false },
        { weightGrams: 5000, quantity: 2, isBulky: false },
      ]),
    ).toEqual({ weightGrams: 11_200, hasBulkyItems: false });
    expect(shipmentOf([{ weightGrams: 120_000, quantity: 1, isBulky: true }]).hasBulkyItems).toBe(
      true,
    );
  });
});
