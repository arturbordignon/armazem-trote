import type { FreightMethodCode, PaymentMethod } from './constants';

export interface OrderLine {
  productName: string;
  optionName: string | null;
  optionValue: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/** Everything the confirmation telegram and the tracking map show. */
export interface OrderConfirmation {
  publicId: string;
  number: string;
  customerName: string;
  city: string;
  uf: string;
  freightMethod: FreightMethodCode;
  freightMethodName: string;
  freightMinDays: number;
  freightMaxDays: number;
  leagues: number;
  paymentMethod: PaymentMethod;
  lines: OrderLine[];
  subtotalCents: number;
  discountCents: number;
  freightCents: number;
  totalCents: number;
  createdAt: string;
}

export interface PlacedOrder {
  publicId: string;
  number: string;
}
