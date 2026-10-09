import 'server-only';
import { cacheKey, cached, currentGeneration } from '@/lib/cache';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { FreightMethodSummary } from '@/models/catalog.types';
import type { FreightMethod, FreightQuote, ShipmentProfile } from '@/models/freight.types';
import { findShippingInfoBySlug } from '@/repositories/catalog.repository';
import * as freightRepository from '@/repositories/freight.repository';
import { INVALID_CEP_MESSAGE } from '@/validators/common';
import {
  assertWholeKilogramAllowances,
  bucketWeightGrams,
  cepPrefix,
  normalizeCep,
  quoteFreight,
  waiveFreight,
  weightBucketKg,
} from './freight.rules';

const DAY_SECONDS = 24 * 60 * 60;
const TTL_SECONDS = { methods: DAY_SECONDS, quote: DAY_SECONDS } as const;
const FREIGHT_GENERATION = 'freight';

async function freightKey(...parts: readonly (string | number)[]): Promise<string> {
  return cacheKey('freight', await currentGeneration(FREIGHT_GENERATION), ...parts);
}

export async function getFreightMethods(): Promise<FreightMethod[]> {
  return cached(await freightKey('methods'), TTL_SECONDS.methods, async () => {
    const methods = await freightRepository.findActiveFreightMethods();
    assertWholeKilogramAllowances(methods);
    return methods;
  });
}

/** The three animals as the home page explains them ("Frete por Tracção Animal"). */
export async function getFreightMethodSummaries(): Promise<FreightMethodSummary[]> {
  return (await getFreightMethods()).map((m) => ({
    code: m.code,
    name: m.name,
    tier: m.tier,
    description: m.description,
    minDays: m.minDays,
    maxDays: m.maxDays,
    isFree: m.basePriceCents === 0 && m.pricePerLeagueCents === 0 && m.pricePerExtraKgCents === 0,
  }));
}

export interface QuoteOptions {
  /** A coupon such as TROTE: same animals and dates, nothing to pay. */
  freeFreight?: boolean;
}

/**
 * Quotes a shipment to a CEP. The quote depends only on the CEP prefix, the weight in whole
 * kilograms and whether anything is bulky, so it is cached on exactly those three values.
 */
export async function quoteShipment(
  cep: string,
  shipment: ShipmentProfile,
  options: QuoteOptions = {},
): Promise<FreightQuote> {
  const digits = normalizeCep(cep);
  if (!digits) throw new ValidationError(INVALID_CEP_MESSAGE, { cep: [INVALID_CEP_MESSAGE] });

  const prefix = cepPrefix(digits);
  const bucketKg = weightBucketKg(shipment.weightGrams);
  const key = await freightKey(
    'quote',
    prefix,
    bucketKg,
    shipment.hasBulkyItems ? 'bulky' : 'light',
  );
  const quote = await cached(key, TTL_SECONDS.quote, async () =>
    quoteFreight(await getFreightMethods(), prefix, {
      weightGrams: bucketWeightGrams(bucketKg),
      hasBulkyItems: shipment.hasBulkyItems,
    }),
  );
  return options.freeFreight ? waiveFreight(quote) : quote;
}

/** "Calcular o frete" on a product page: that product, in the chosen quantity. */
export async function quoteProduct(
  cep: string,
  slug: string,
  quantity: number,
): Promise<FreightQuote> {
  const product = await findShippingInfoBySlug(slug);
  if (!product) throw new NotFoundError();
  return quoteShipment(cep, {
    weightGrams: product.weightGrams * quantity,
    hasBulkyItems: product.isBulky,
  });
}
