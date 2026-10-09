import { describe, expect, it } from 'vitest';
import { addressSchema, paymentSchema, placeOrderSchema } from '@/validators/checkout';
import { couponSchema } from '@/validators/cart';

const address = {
  nome: 'Joaquina da Silva',
  tel: '(35) 99999-0000',
  cep: '37540-000',
  rua: 'Estrada Velha do Rosário',
  num: '12',
  comp: '',
  cidade: 'Ouro Fino',
  uf: 'mg',
};

const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('addressSchema', () => {
  it('normalizes CEP and UF', () => {
    expect(addressSchema.parse(address)).toMatchObject({ cep: '37540000', uf: 'MG' });
  });

  it('explains every missing field in the design’s words', () => {
    const result = addressSchema.safeParse({
      nome: 'Jo',
      tel: '123',
      cep: '1',
      rua: ' ',
      num: '',
      cidade: '',
      uf: 'M',
    });
    expect(messages(result)).toEqual({
      nome: 'Diga seu nome completo, para o cocheiro chamar na porteira.',
      tel: 'Telefone com DDD: ao menos 10 números.',
      cep: 'O CEP precisa de 8 números, como 37540-000.',
      rua: 'Sem rua, o burro fica rodando em círculos.',
      num: 'Informe o número (ou “s/n”).',
      cidade: 'Qual é a cidade?',
      uf: 'UF com 2 letras.',
    });
  });
});

describe('paymentSchema', () => {
  it('requires a signature for fiado', () => {
    expect(messages(paymentSchema.safeParse({ payment: 'fiado', assinatura: 'Jo' }))).toEqual({
      assinatura: 'Assine a caderneta com seu nome.',
    });
    expect(paymentSchema.safeParse({ payment: 'fiado', assinatura: 'Joaquina' }).success).toBe(
      true,
    );
  });

  it('requires the sworn statement about the chickens', () => {
    expect(messages(paymentSchema.safeParse({ payment: 'galinhas' }))).toEqual({
      galinhas: 'Confirme que as galinhas são poedeiras e de boa índole.',
    });
    expect(paymentSchema.safeParse({ payment: 'galinhas', galinhas: true }).success).toBe(true);
  });

  it('asks for a payment method', () => {
    expect(messages(paymentSchema.safeParse({}))).toEqual({
      payment: 'Escolha como vai acertar a conta.',
    });
  });
});

describe('placeOrderSchema', () => {
  it('requires an idempotency key and a known animal', () => {
    const result = placeOrderSchema.safeParse({
      address,
      freight: 'jegue',
      payment: { payment: 'cocheiro' },
      idempotencyKey: 'not-a-uuid',
    });
    expect(Object.keys(messages(result)).sort()).toEqual(['freight', 'idempotencyKey']);
    expect(messages(result).freight).toBe('Escolha um animal de entrega para seguir viagem.');
  });
});

describe('couponSchema', () => {
  it('trims and upper-cases codes', () => {
    expect(couponSchema.parse({ code: ' galinha10 ' })).toEqual({ code: 'GALINHA10' });
    expect(messages(couponSchema.safeParse({ code: '  ' }))).toEqual({
      code: 'Escreva o cupom antes, freguês.',
    });
  });
});
