import * as z from 'zod/mini';
import { PAYMENT_METHODS } from '@/models/constants';
import { freightMethodSchema } from './cart';
import { cepSchema } from './common';

const MIN_NAME_LENGTH = 3;
const MIN_PHONE_DIGITS = 10;
const MAX_FIELD_LENGTH = 120;

const text = (message: string) =>
  z.string(message).check(z.trim(), z.minLength(1, message), z.maxLength(MAX_FIELD_LENGTH));

/** Step I, "Para onde vai a encomenda?". Messages are the design's. */
export const addressSchema = z.object({
  nome: z
    .string()
    .check(
      z.trim(),
      z.minLength(MIN_NAME_LENGTH, 'Diga seu nome completo, para o cocheiro chamar na porteira.'),
      z.maxLength(MAX_FIELD_LENGTH),
    ),
  tel: z.string().check(
    z.refine(
      (value) => value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS,
      'Telefone com DDD: ao menos 10 números.',
    ),
    z.maxLength(20),
  ),
  cep: cepSchema,
  rua: text('Sem rua, o burro fica rodando em círculos.'),
  num: text('Informe o número (ou “s/n”).'),
  comp: z.optional(z.string().check(z.trim(), z.maxLength(MAX_FIELD_LENGTH))),
  cidade: text('Qual é a cidade?'),
  uf: z.pipe(
    z.string().check(z.trim(), z.regex(/^[a-zA-Z]{2}$/, 'UF com 2 letras.')),
    z.transform((uf) => uf.toUpperCase()),
  ),
});

export type AddressInput = z.infer<typeof addressSchema>;
export const ADDRESS_FIELDS = Object.keys(addressSchema.shape) as (keyof AddressInput)[];

/** Step III, "Como vai acertar?". Fiado needs a signature; chickens need a sworn statement. */
export const paymentSchema = z
  .object({
    payment: z.enum(PAYMENT_METHODS, 'Escolha como vai acertar a conta.'),
    assinatura: z.optional(z.string().check(z.trim(), z.maxLength(MAX_FIELD_LENGTH))),
    galinhas: z.optional(z.boolean()),
  })
  .check(
    z.refine((p) => p.payment !== 'fiado' || (p.assinatura?.length ?? 0) >= MIN_NAME_LENGTH, {
      message: 'Assine a caderneta com seu nome.',
      path: ['assinatura'],
    }),
    z.refine((p) => p.payment !== 'galinhas' || p.galinhas === true, {
      message: 'Confirme que as galinhas são poedeiras e de boa índole.',
      path: ['galinhas'],
    }),
  );

export type PaymentInput = z.infer<typeof paymentSchema>;

/** The whole order, re-validated on the server whatever the browser already checked. */
export const placeOrderSchema = z.object({
  address: addressSchema,
  freight: freightMethodSchema,
  payment: paymentSchema,
  /** One per checkout attempt (crypto.randomUUID in the browser); retries reuse it. */
  idempotencyKey: z.uuid(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
