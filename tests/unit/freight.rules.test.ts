import { describe, expect, it } from 'vitest';
import type { FreightMethod } from '@/models/freight.types';
import {
  BULKY_ITEMS_REASON,
  assertWholeKilogramAllowances,
  bucketWeightGrams,
  cepPrefix,
  deliveryWindow,
  destinationFor,
  extraKilograms,
  normalizeCep,
  priceCents,
  quoteFreight,
  roadConditionsFor,
  roadSeed,
  waiveFreight,
  weightBucketKg,
} from '@/services/freight.rules';

const burro: FreightMethod = {
  code: 'burro',
  name: 'Burro',
  tier: 'Econômico',
  description: 'Anda devagar.',
  basePriceCents: 0,
  pricePerLeagueCents: 0,
  includedWeightGrams: 30_000,
  pricePerExtraKgCents: 0,
  minDays: 15,
  maxDays: 20,
  leaguesPerExtraDay: 120,
  carriesBulky: false,
};
const cavalo: FreightMethod = {
  ...burro,
  code: 'cavalo',
  name: 'Cavalo',
  basePriceCents: 1290,
  pricePerLeagueCents: 9,
  includedWeightGrams: 20_000,
  pricePerExtraKgCents: 50,
  minDays: 5,
  maxDays: 7,
  leaguesPerExtraDay: 200,
};
const charrete: FreightMethod = {
  ...burro,
  code: 'charrete',
  name: 'Charrete',
  basePriceCents: 2490,
  pricePerLeagueCents: 14,
  includedWeightGrams: 100_000,
  pricePerExtraKgCents: 10,
  minDays: 7,
  maxDays: 10,
  leaguesPerExtraDay: 150,
  carriesBulky: true,
};
const METHODS = [burro, cavalo, charrete];
const light = { weightGrams: 1_200, hasBulkyItems: false };

describe('normalizeCep', () => {
  it.each([
    ['37540-000', '37540000'],
    ['37 540 000', '37540000'],
    ['01310100', '01310100'],
  ])('accepts %s', (input, digits) => {
    expect(normalizeCep(input)).toBe(digits);
  });

  it.each(['3754-000', '375400001', '', 'abc'])('rejects %s', (input) => {
    expect(normalizeCep(input)).toBeNull();
  });
});

describe('destinationFor', () => {
  it('maps the first digit to a region and the prefix to léguas from Ouro Fino', () => {
    // Same arithmetic as the design: 30 km + |prefix − 37540| × 0.045, 6.6 km per légua.
    expect(destinationFor('30140')).toEqual({
      cepPrefix: '30140',
      city: 'Belo Horizonte',
      uf: 'MG',
      km: 363,
      leagues: 55,
    });
    expect(destinationFor('90010')).toMatchObject({
      city: 'Porto Alegre',
      uf: 'RS',
      km: 2391,
      leagues: 362,
    });
  });

  it('never quotes less than one légua, even next door', () => {
    expect(destinationFor('37540')).toMatchObject({ km: 30, leagues: 5 });
    expect(destinationFor('37541').leagues).toBeGreaterThanOrEqual(1);
  });

  it('rejects malformed prefixes', () => {
    expect(() => destinationFor('3754')).toThrow(/Invalid CEP prefix/);
  });
});

describe('road conditions', () => {
  it('derive from the digit sum of the prefix only', () => {
    expect(roadSeed('30140')).toBe(8);
    expect(cepPrefix('30140071')).toBe('30140');
  });

  it('are deterministic per animal', () => {
    // seed 8: burro neither (8 % 3 = 2, even); cavalo rested (−1); charrete fresh road (8 % 3 ≠ 1)
    expect(roadConditionsFor('burro', '30140')).toEqual([]);
    expect(roadConditionsFor('cavalo', '30140')).toEqual([
      { label: 'Cavalo descansado', deltaDays: -1 },
    ]);
    expect(roadConditionsFor('charrete', '30140')).toEqual([
      { label: 'Estrada recém-batida', deltaDays: -1 },
    ]);
    // seed 9: grumpy donkey (+1) and rain (+2); cavalo neither; rain for the cart (9 % 3 = 0 → fresh road)
    expect(roadConditionsFor('burro', '90000')).toEqual([
      { label: 'Burro de mau humor', deltaDays: 1 },
      { label: 'Chuva na estrada', deltaDays: 2 },
    ]);
    // seed 11: flooded river for the horse (11 % 5 = 1)
    expect(roadConditionsFor('cavalo', '29000')).toContainEqual({
      label: 'Rio cheio, ponte fechada',
      deltaDays: 3,
    });
  });
});

describe('priceCents', () => {
  const bh = destinationFor('30140');

  it('charges a base price plus a rate per légua, in integer cents', () => {
    expect(priceCents(cavalo, bh, light.weightGrams)).toBe(1290 + 9 * 55);
    expect(priceCents(charrete, bh, light.weightGrams)).toBe(2490 + 14 * 55);
  });

  it('keeps the donkey free regardless of distance and weight', () => {
    expect(priceCents(burro, destinationFor('90010'), 80_000)).toBe(0);
  });

  it('adds a surcharge per started kilogram above the allowance', () => {
    expect(extraKilograms(cavalo, 20_000)).toBe(0);
    expect(extraKilograms(cavalo, 20_001)).toBe(1);
    expect(extraKilograms(cavalo, 23_500)).toBe(4);
    expect(priceCents(cavalo, bh, 23_500)).toBe(1290 + 9 * 55 + 4 * 50);
  });
});

describe('deliveryWindow', () => {
  it('adds a day per stretch of road and applies road conditions', () => {
    const portoAlegre = destinationFor('90010'); // 362 léguas
    expect(deliveryWindow(burro, portoAlegre, [])).toEqual({ minDays: 18, maxDays: 23 });
    expect(deliveryWindow(cavalo, portoAlegre, [{ label: 'x', deltaDays: 3 }])).toEqual({
      minDays: 9,
      maxDays: 11,
    });
  });

  it('never promises less than a day, and keeps a window of at least one day', () => {
    const near = destinationFor('37540');
    const fast = { ...cavalo, minDays: 1, maxDays: 2 };
    expect(deliveryWindow(fast, near, [{ label: 'x', deltaDays: -5 }])).toEqual({
      minDays: 1,
      maxDays: 2,
    });
  });
});

describe('quoteFreight', () => {
  it('quotes every animal for a light parcel', () => {
    const quote = quoteFreight(METHODS, '30140', light);
    expect(quote.destination.city).toBe('Belo Horizonte');
    expect(quote.options.map((o) => [o.code, o.priceCents, o.minDays, o.maxDays])).toEqual([
      ['burro', 0, 15, 20],
      ['cavalo', 1785, 4, 6],
      ['charrete', 3260, 6, 9],
    ]);
    expect(quote.options.every((o) => o.unavailableReason === null)).toBe(true);
  });

  it('only lets the cart take bulky goods', () => {
    const quote = quoteFreight(METHODS, '30140', { weightGrams: 38_000, hasBulkyItems: true });
    expect(quote.options.map((o) => o.unavailableReason)).toEqual([
      BULKY_ITEMS_REASON,
      BULKY_ITEMS_REASON,
      null,
    ]);
  });

  it('is a pure function of its inputs', () => {
    expect(quoteFreight(METHODS, '01310', light)).toEqual(quoteFreight(METHODS, '01310', light));
  });

  it('waives every price for a free-freight coupon without changing dates', () => {
    const quote = quoteFreight(METHODS, '01310', light);
    const waived = waiveFreight(quote);
    expect(waived.options.map((o) => o.priceCents)).toEqual([0, 0, 0]);
    expect(waived.options.map((o) => o.maxDays)).toEqual(quote.options.map((o) => o.maxDays));
  });
});

describe('weight buckets', () => {
  it('bucket by started kilogram', () => {
    expect(weightBucketKg(1)).toBe(1);
    expect(weightBucketKg(1000)).toBe(1);
    expect(weightBucketKg(1001)).toBe(2);
    expect(weightBucketKg(0)).toBe(1);
  });

  it('quote every weight in a bucket exactly like its upper bound', () => {
    const bh = destinationFor('30140');
    for (const grams of [20_001, 20_500, 21_000]) {
      expect(priceCents(cavalo, bh, grams)).toBe(
        priceCents(cavalo, bh, bucketWeightGrams(weightBucketKg(grams))),
      );
    }
  });

  it('require whole-kilogram allowances', () => {
    expect(() => assertWholeKilogramAllowances(METHODS)).not.toThrow();
    expect(() =>
      assertWholeKilogramAllowances([{ ...cavalo, includedWeightGrams: 20_500 }]),
    ).toThrow(/cavalo/);
  });
});
