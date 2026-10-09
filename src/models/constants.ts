import type { CartView } from './cart.types';

// Domain constants shared by the schema, validators and UI. Pure values only.

/** Ratings are horseshoes, 1 to 5. */
export const RATING_LEVELS = 5;

/** The design caps every cart line at 99 units. */
export const MAX_LINE_QUANTITY = 99;

/** Brazilian CEP: 8 digits. */
export const CEP_DIGITS = 8;

export const FREIGHT_METHOD_CODES = ['burro', 'cavalo', 'charrete'] as const;
export type FreightMethodCode = (typeof FREIGHT_METHOD_CODES)[number];

export const PAYMENT_METHODS = ['cocheiro', 'fiado', 'galinhas'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const COUPON_KINDS = ['percent_off', 'amount_off', 'free_freight'] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

export const ORDER_STATUSES = ['placed', 'dispatched', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const LISTING_SORTS = ['relevancia', 'menor-preco', 'maior-preco', 'ferraduras'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export const FIT_FILTERS = ['tanto-faz', 'lombo', 'charrete'] as const;
/** "Cabe na charrete?": any, fits on an animal's back, or bulky (cart only). */
export type FitFilter = (typeof FIT_FILTERS)[number];

/** Products per listing or search page. */
export const PAGE_SIZE = 24;

/** The price filter slider runs R$ 10 → R$ 2.500; the top of the range means "no limit". */
export const PRICE_FILTER_MIN_CENTS = 1_000;
export const PRICE_FILTER_MAX_CENTS = 250_000;
export const PRICE_FILTER_STEP_CENTS = 1_000;

/** Autocomplete starts suggesting after two characters (as in the design). */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

/** Distinct lines a guest cart may hold. */
export const MAX_CART_LINES = 50;

/** How the customer settles the bill (all mocked: nothing is charged). */
export const PAYMENT_OPTIONS: Readonly<
  Record<PaymentMethod, { label: string; description: string }>
> = {
  cocheiro: {
    label: 'Pagar ao cocheiro na entrega',
    description: 'Em dinheiro, na porteira. Ele dá troco (às vezes em balas).',
  },
  fiado: {
    label: 'Fiado (anotado na caderneta)',
    description: 'Assinatura caprichada e a gente confia. Acerte até o fim da colheita.',
  },
  galinhas: {
    label: 'Troca por 3 galinhas',
    description: 'Entregues ao cocheiro, que volta com elas no lombo. Ovos aceitos como gorjeta.',
  },
};

/** A cart with nothing in it: what visitors without a cart cookie see. */
export const EMPTY_CART: CartView = {
  lines: [],
  totals: { itemCount: 0, subtotalCents: 0, discountCents: 0, freightCents: null, totalCents: 0 },
  coupon: null,
  destination: null,
  cep: null,
  freightOptions: [],
  selectedFreight: null,
};
