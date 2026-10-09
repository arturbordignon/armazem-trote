// Freight pricing and delivery-time rules. Pure functions, no I/O: the same CEP prefix and
// shipment always produce the same quote, which is what makes quotes cacheable.
import { CEP_DIGITS, type FreightMethodCode } from '@/models/constants';
import type {
  FreightDestination,
  FreightMethod,
  FreightOption,
  FreightQuote,
  RoadCondition,
  ShipmentProfile,
} from '@/models/freight.types';

export const CEP_PREFIX_DIGITS = 5;
const GRAMS_PER_KG = 1000;

/** The shop: Rua do Commercio, 12 · Ouro Fino, MG (CEP 37540-000). */
const ORIGIN_CEP_PREFIX = 37_540;
const BASE_KM = 30;
/** How far apart two neighbouring CEP prefixes are assumed to be on the road. */
const KM_PER_PREFIX_STEP = 0.045;
/** A Brazilian légua de sesmaria, rounded. */
const KM_PER_LEAGUE = 6.6;

/** Region (capital and UF) by the CEP's first digit, as the post office splits the country. */
const REGIONS: readonly (readonly [city: string, uf: string])[] = [
  ['São Paulo', 'SP'],
  ['São Paulo', 'SP'],
  ['Rio de Janeiro', 'RJ'],
  ['Belo Horizonte', 'MG'],
  ['Salvador', 'BA'],
  ['Recife', 'PE'],
  ['Fortaleza', 'CE'],
  ['Goiânia', 'GO'],
  ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'],
];

export const BULKY_ITEMS_REASON = 'Não cabe no lombo. Esta encomenda só vai de charrete.';

/**
 * Road conditions per animal, picked by a deterministic "road seed" (the digit sum of the CEP
 * prefix). Weather is the same for everyone heading to the same place, so quotes stay cacheable.
 */
const ROAD_CONDITIONS: Readonly<Record<FreightMethodCode, (seed: number) => RoadCondition[]>> = {
  burro: (seed) => [
    ...(seed % 3 === 0 ? [{ label: 'Burro de mau humor', deltaDays: 1 }] : []),
    ...(seed % 2 === 1 ? [{ label: 'Chuva na estrada', deltaDays: 2 }] : []),
  ],
  cavalo: (seed) => [
    ...(seed % 2 === 0 ? [{ label: 'Cavalo descansado', deltaDays: -1 }] : []),
    ...(seed % 5 === 1 ? [{ label: 'Rio cheio, ponte fechada', deltaDays: 3 }] : []),
  ],
  charrete: (seed) => [
    seed % 3 === 1
      ? { label: 'Chuva na estrada', deltaDays: 2 }
      : { label: 'Estrada recém-batida', deltaDays: -1 },
  ],
};

/** Digits of a CEP typed in any format ("37540-000", "37 540 000"), or null if not 8 digits. */
export function normalizeCep(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length === CEP_DIGITS ? digits : null;
}

export function cepPrefix(cepDigits: string): string {
  return cepDigits.slice(0, CEP_PREFIX_DIGITS);
}

export function destinationFor(prefix: string): FreightDestination {
  const region = REGIONS[Number(prefix[0])];
  if (prefix.length !== CEP_PREFIX_DIGITS || !region) {
    throw new Error(`Invalid CEP prefix "${prefix}"`);
  }
  const km = Math.round(
    BASE_KM + Math.abs(Number(prefix) - ORIGIN_CEP_PREFIX) * KM_PER_PREFIX_STEP,
  );
  const [city, uf] = region;
  return { cepPrefix: prefix, city, uf, km, leagues: Math.max(1, Math.round(km / KM_PER_LEAGUE)) };
}

export function roadSeed(prefix: string): number {
  return [...prefix].reduce((sum, digit) => sum + Number(digit), 0);
}

export function roadConditionsFor(code: FreightMethodCode, prefix: string): RoadCondition[] {
  return ROAD_CONDITIONS[code](roadSeed(prefix));
}

/** Kilograms above what the animal carries for the base price, rounded up. */
export function extraKilograms(method: FreightMethod, weightGrams: number): number {
  return Math.max(0, Math.ceil((weightGrams - method.includedWeightGrams) / GRAMS_PER_KG));
}

export function priceCents(
  method: FreightMethod,
  destination: FreightDestination,
  weightGrams: number,
): number {
  return (
    method.basePriceCents +
    method.pricePerLeagueCents * destination.leagues +
    method.pricePerExtraKgCents * extraKilograms(method, weightGrams)
  );
}

/** Delivery window: the animal's usual days, plus a day per stretch of road, plus conditions. */
export function deliveryWindow(
  method: FreightMethod,
  destination: FreightDestination,
  conditions: readonly RoadCondition[],
): { minDays: number; maxDays: number } {
  const distanceDays = Math.floor(destination.leagues / method.leaguesPerExtraDay);
  const conditionDays = conditions.reduce((sum, c) => sum + c.deltaDays, 0);
  const minDays = Math.max(1, method.minDays + distanceDays + conditionDays);
  const maxDays = Math.max(minDays + 1, method.maxDays + distanceDays + conditionDays);
  return { minDays, maxDays };
}

export function quoteOption(
  method: FreightMethod,
  destination: FreightDestination,
  shipment: ShipmentProfile,
): FreightOption {
  const roadConditions = roadConditionsFor(method.code, destination.cepPrefix);
  return {
    code: method.code,
    name: method.name,
    tier: method.tier,
    description: method.description,
    priceCents: priceCents(method, destination, shipment.weightGrams),
    ...deliveryWindow(method, destination, roadConditions),
    roadConditions,
    unavailableReason: shipment.hasBulkyItems && !method.carriesBulky ? BULKY_ITEMS_REASON : null,
  };
}

export function quoteFreight(
  methods: readonly FreightMethod[],
  prefix: string,
  shipment: ShipmentProfile,
): FreightQuote {
  const destination = destinationFor(prefix);
  return { destination, options: methods.map((m) => quoteOption(m, destination, shipment)) };
}

/** A coupon such as TROTE waives freight: same animals and dates, nothing to pay. */
export function waiveFreight(quote: FreightQuote): FreightQuote {
  return { ...quote, options: quote.options.map((o) => ({ ...o, priceCents: 0 })) };
}

/**
 * Quotes only change per whole kilogram (see `extraKilograms`), so weights are bucketed by
 * kilogram for caching. Quoting the bucket's upper bound gives the exact price for every weight
 * in it, provided each method's included weight is a whole number of kilograms.
 */
export function weightBucketKg(weightGrams: number): number {
  return Math.max(1, Math.ceil(weightGrams / GRAMS_PER_KG));
}

export function bucketWeightGrams(bucketKg: number): number {
  return bucketKg * GRAMS_PER_KG;
}

export function assertWholeKilogramAllowances(methods: readonly FreightMethod[]): void {
  const odd = methods.filter((m) => m.includedWeightGrams % GRAMS_PER_KG !== 0);
  if (odd.length > 0) {
    throw new Error(
      `Freight allowances must be whole kilograms for weight bucketing: ${odd.map((m) => m.code).join(', ')}`,
    );
  }
}
