'use client';

import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useState } from 'react';
import type * as z from 'zod/mini';
import { placeOrderAction } from '@/controllers/checkout.actions';
import type { CartView } from '@/models/cart.types';
import { PAYMENT_METHODS, PAYMENT_OPTIONS, type PaymentMethod } from '@/models/constants';
import type { AddressInput } from '@/validators/checkout';
import { chooseFreight, resetCart, setDestination } from '@/components/cart/cart-store';
import { CartTotals } from '@/components/cart/CartTotals';
import { LineItem } from '@/components/cart/LineItem';
import { useCart } from '@/components/cart/use-cart';
import { destinationLabel, maskCep } from '@/components/freight/destination';
import { Button } from '@/components/ui/Button';
import heading from '@/components/ui/Heading.module.css';
import { RoadStepper } from './RoadStepper';
import styles from './Checkout.module.css';

const FreightOptions = dynamic(() => import('@/components/freight/FreightOptions'));

type Step = 1 | 2 | 3;
type Errors = Record<string, string>;
type Address = Record<keyof AddressInput, string>;

/** Step I fields, in the design's order, with their placeholder and flex basis. */
const FIELDS: readonly {
  id: keyof AddressInput;
  label: string;
  placeholder: string;
  basis: string;
}[] = [
  { id: 'nome', label: 'Nome completo', placeholder: 'Joaquina da Silva', basis: '100%' },
  { id: 'tel', label: 'Telefone', placeholder: '(35) 99999-0000', basis: '200px' },
  { id: 'cep', label: 'CEP', placeholder: '00000-000', basis: '140px' },
  { id: 'rua', label: 'Rua / Estrada', placeholder: 'Estrada Velha do Rosário', basis: '280px' },
  { id: 'num', label: 'Número', placeholder: '12', basis: '90px' },
  {
    id: 'comp',
    label: 'Complemento (opcional)',
    placeholder: 'Sítio, porteira azul',
    basis: '200px',
  },
  { id: 'cidade', label: 'Cidade', placeholder: 'Ouro Fino', basis: '200px' },
  { id: 'uf', label: 'UF', placeholder: 'MG', basis: '70px' },
];

const EMPTY_ADDRESS: Address = {
  nome: '',
  tel: '',
  cep: '',
  rua: '',
  num: '',
  comp: '',
  cidade: '',
  uf: '',
};

/** Light input shaping as the customer types (validation proper happens on submit). */
const SHAPERS: Partial<Record<keyof AddressInput, (value: string) => string>> = {
  cep: maskCep,
  uf: (value) =>
    value
      .replace(/[^a-z]/gi, '')
      .slice(0, 2)
      .toUpperCase(),
  tel: (value) => value.replace(/[^\d() -]/g, '').slice(0, 16),
};

const FREIGHT_REQUIRED = 'Escolha um animal de entrega para seguir viagem.';

/**
 * The shared zod schemas are only needed once the customer submits a step, so they load then
 * instead of weighing on the page's first load.
 */
const loadSchemas = () => import('@/validators/checkout');

/** zod issues → { field: first message }, keyed by the last path segment ("address.cep" → "cep"). */
function issuesToErrors(issues: readonly z.core.$ZodIssue[]): Errors {
  const errors: Errors = {};
  for (const issue of issues) {
    const field = String(issue.path.at(-1) ?? '_');
    errors[field] ??= issue.message;
  }
  return errors;
}

/**
 * "Acertar a encomenda": address → animal → payment. Each step is checked in the browser with
 * the same zod schemas the server uses; the server re-validates and prices everything again.
 */
export function CheckoutFlow({ serverCart }: { serverCart: CartView }) {
  const router = useRouter();
  const cart = useCart(serverCart);
  const [step, setStep] = useState<Step>(1);
  const [address, setAddress] = useState<Address>({
    ...EMPTY_ADDRESS,
    cep: serverCart.cep ? maskCep(serverCart.cep) : '',
  });
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [signature, setSignature] = useState('');
  const [chickensSworn, setChickensSworn] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout: a retried submit can never place a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const update = (field: keyof AddressInput) => (event: ChangeEvent<HTMLInputElement>) => {
    const shape = SHAPERS[field];
    setAddress((current) => ({
      ...current,
      [field]: shape ? shape(event.target.value) : event.target.value,
    }));
    setErrors(({ [field]: cleared, ...rest }) => rest);
  };

  /** Fetches the quote for the CEP and fills city and UF if the customer left them blank. */
  const lookUpCep = async (): Promise<boolean> => {
    const result = await setDestination(address.cep);
    if (!result.ok) {
      setErrors((current) => ({ ...current, cep: result.error.message }));
      return false;
    }
    const destination = result.data.destination;
    if (destination) {
      setAddress((current) => ({
        ...current,
        cidade: current.cidade || destination.city,
        uf: current.uf || destination.uf,
      }));
    }
    return true;
  };

  const next = async () => {
    if (step === 1) {
      const { addressSchema } = await loadSchemas();
      const parsed = addressSchema.safeParse(address);
      if (!parsed.success) return setErrors(issuesToErrors(parsed.error.issues));
      if (!(await lookUpCep())) return;
      setErrors({});
      setStep(2);
      window.scrollTo({ top: 0 });
      return;
    }
    if (step === 2) {
      if (!cart.selectedFreight) return setErrors({ freight: FREIGHT_REQUIRED });
      setErrors({});
      setStep(3);
      return;
    }
    await placeOrder();
  };

  const placeOrder = async () => {
    const { addressSchema, paymentSchema } = await loadSchemas();
    const paymentInput = { payment, assinatura: signature, galinhas: chickensSworn };
    const parsedPayment = paymentSchema.safeParse(paymentInput);
    const parsedAddress = addressSchema.safeParse(address);
    if (!parsedPayment.success) return setErrors(issuesToErrors(parsedPayment.error.issues));
    if (!parsedAddress.success || !cart.selectedFreight) return setStep(1);

    setSubmitting(true);
    const result = await placeOrderAction({
      address: parsedAddress.data,
      freight: cart.selectedFreight,
      payment: parsedPayment.data,
      idempotencyKey,
    });
    if (result.ok) {
      resetCart();
      router.push(`/encomenda/${result.data.publicId}` as Route);
      return;
    }
    setSubmitting(false);
    const fieldErrors = Object.fromEntries(
      Object.entries(result.error.fieldErrors ?? {}).map(([path, messages]) => [
        path.split('.').at(-1) ?? path,
        messages[0] ?? '',
      ]),
    );
    setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { _: result.error.message });
    if (FIELDS.some((field) => field.id in fieldErrors)) setStep(1);
    else if ('freight' in fieldErrors) setStep(2);
  };

  const back = () => {
    if (step === 1) return router.push('/carroca');
    setErrors({});
    setStep((step - 1) as Step);
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <section className={`${heading.container} ${styles.page}`}>
      <h1 className={styles.title}>Acertar a encomenda</h1>
      <RoadStepper step={step} />
      <div className={styles.layout}>
        <div className={styles.form}>
          {errorList.length > 1 && (
            <div role="alert" className={styles.alert}>
              <strong className={styles.alertTitle}>Opa, faltou coisa no formulário:</strong>
              {errorList.map((message) => (
                <div key={message}>· {message}</div>
              ))}
            </div>
          )}
          {errors._ && errorList.length === 1 && (
            <div role="alert" className={styles.alert}>
              {errors._}
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className={styles.stepTitle}>I. Para onde vai a encomenda?</h2>
              <div className={styles.fields}>
                {FIELDS.map((field) => {
                  const error = errors[field.id];
                  const id = `f-${field.id}`;
                  return (
                    <div
                      key={field.id}
                      className={styles.field}
                      style={{ flex: `1 1 ${field.basis}` }}
                    >
                      <label htmlFor={id} className={styles.fieldLabel}>
                        {field.label}
                      </label>
                      <input
                        id={id}
                        className={styles.input}
                        value={address[field.id]}
                        placeholder={field.placeholder}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${id}-err` : undefined}
                        inputMode={field.id === 'cep' || field.id === 'tel' ? 'tel' : undefined}
                        onChange={update(field.id)}
                        onBlur={field.id === 'cep' ? () => void lookUpCep() : undefined}
                      />
                      {error && (
                        <span id={`${id}-err`} className={styles.fieldError}>
                          {error}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={styles.stepTitle}>II. Quem leva?</h2>
              <span className={styles.destination}>{destinationLabel(cart.destination)}</span>
              <FreightOptions
                options={cart.freightOptions}
                selected={cart.selectedFreight}
                onSelect={(code) => {
                  setErrors({});
                  void chooseFreight(code).then((result) => {
                    if (!result.ok) setErrors({ freight: result.error.message });
                  });
                }}
              />
              {errors.freight && <span className={styles.bigError}>{errors.freight}</span>}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className={styles.stepTitle}>III. Como vai acertar?</h2>
              <p className={styles.lede}>
                Nada de machina de cartão: aqui o trato é no fio do bigode.
              </p>
              <fieldset className={styles.payments}>
                <legend className="visually-hidden">Forma de pagamento</legend>
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className={styles.payment}>
                    <input
                      type="radio"
                      name="pay"
                      checked={payment === method}
                      onChange={() => {
                        setPayment(method);
                        setErrors({});
                      }}
                    />
                    <span className={styles.paymentText}>
                      <span className={styles.paymentLabel}>{PAYMENT_OPTIONS[method].label}</span>
                      <span className={styles.paymentDescription}>
                        {PAYMENT_OPTIONS[method].description}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {payment === 'fiado' && (
                <div className={styles.extra}>
                  <label htmlFor="ass" className={styles.fieldLabel}>
                    Assigne a caderneta
                  </label>
                  <input
                    id="ass"
                    className={styles.signature}
                    value={signature}
                    placeholder="Seu nome, com capricho"
                    aria-invalid={Boolean(errors.assinatura)}
                    onChange={(event) => setSignature(event.target.value)}
                  />
                  {errors.assinatura && (
                    <span className={styles.fieldError}>{errors.assinatura}</span>
                  )}
                </div>
              )}
              {payment === 'galinhas' && (
                <>
                  <label className={`${styles.extra} ${styles.oath}`}>
                    <input
                      type="checkbox"
                      checked={chickensSworn}
                      onChange={(event) => setChickensSworn(event.target.checked)}
                    />
                    Declaro que as 3 gallinhas são poedeiras, vacinadas e de boa índole.
                  </label>
                  {errors.galinhas && <span className={styles.fieldError}>{errors.galinhas}</span>}
                </>
              )}
              {errors.payment && <span className={styles.bigError}>{errors.payment}</span>}
            </>
          )}

          <div className={styles.nav}>
            <Button variant="link" className={styles.back} onClick={back}>
              ← {step === 1 ? 'Voltar à carroça' : 'Voltar'}
            </Button>
            <Button size="lg" disabled={submitting} onClick={() => void next()}>
              {step === 3
                ? submitting
                  ? 'Telegrafando…'
                  : 'Confirmar encomenda'
                : 'Continuar viagem'}
            </Button>
          </div>
        </div>

        <aside aria-label="Resumo" className={styles.summary}>
          <h2 className={styles.summaryTitle}>Na carroça</h2>
          {cart.lines.map((line) => (
            <LineItem key={line.variantId} line={line} />
          ))}
          <div className={styles.summaryTotals}>
            <CartTotals cart={cart} compact />
          </div>
        </aside>
      </div>
    </section>
  );
}
