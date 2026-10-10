import * as z from 'zod/mini';
import { FREIGHT_METHOD_CODES, MAX_LINE_QUANTITY } from '@/models/constants';
import { cepSchema, quantitySchema } from './common';

const variantId = z.number().check(z.int(), z.positive());

export const addToCartSchema = z.object({
  variantId,
  quantity: quantitySchema,
});

/** Quantity 0 removes the line. */
export const updateCartLineSchema = z.object({
  variantId,
  quantity: z.number().check(z.int(), z.minimum(0), z.maximum(MAX_LINE_QUANTITY)),
});

export const couponSchema = z.object({
  code: z.pipe(
    z.string().check(z.trim(), z.minLength(1, 'Escreva o cupom antes, freguês.'), z.maxLength(32)),
    z.transform((code) => code.toUpperCase()),
  ),
});

export const destinationSchema = z.object({ cep: cepSchema });

export const freightMethodSchema = z.enum(
  FREIGHT_METHOD_CODES,
  'Escolha um animal de entrega para seguir viagem.',
);

export const freightChoiceSchema = z.object({ method: freightMethodSchema });

/** A product page's quote, kept for the cart: the CEP and, once picked, the animal. */
export const rememberFreightSchema = z.object({
  cep: cepSchema,
  method: z.optional(freightMethodSchema),
});
