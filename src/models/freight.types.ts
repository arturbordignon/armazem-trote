import type { FreightMethodCode } from './constants';

/** Pricing and timing parameters of one delivery animal (a freight_methods row). */
export interface FreightMethod {
  code: FreightMethodCode;
  name: string;
  tier: string;
  description: string;
  basePriceCents: number;
  pricePerLeagueCents: number;
  includedWeightGrams: number;
  pricePerExtraKgCents: number;
  minDays: number;
  maxDays: number;
  leaguesPerExtraDay: number;
  carriesBulky: boolean;
}

/** Where the order is going, derived from the CEP's first five digits only. */
export interface FreightDestination {
  /** Five-digit CEP prefix every quote is computed (and cached) from. */
  cepPrefix: string;
  city: string;
  uf: string;
  km: number;
  leagues: number;
}

export interface RoadCondition {
  label: string;
  /** Days added (positive) or saved (negative). */
  deltaDays: number;
}

export interface FreightOption {
  code: FreightMethodCode;
  name: string;
  tier: string;
  description: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
  roadConditions: RoadCondition[];
  /** Set when this animal can't take the load ("Não cabe no lombo…"). */
  unavailableReason: string | null;
}

export interface FreightQuote {
  destination: FreightDestination;
  options: FreightOption[];
}

/** What is being shipped: everything the quote depends on besides the destination. */
export interface ShipmentProfile {
  weightGrams: number;
  hasBulkyItems: boolean;
}
