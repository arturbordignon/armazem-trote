'use client';

import dynamic from 'next/dynamic';
import { type FormEvent, useState } from 'react';
import { countLabel } from '@/lib/format';
import type { CartView } from '@/models/cart.types';
import { ButtonLink, Button } from '@/components/ui/Button';
import heading from '@/components/ui/Heading.module.css';
import { destinationLabel, maskCep } from '@/components/freight/destination';
import { applyCoupon, chooseFreight, setDestination } from './cart-store';
import { CartTotals } from './CartTotals';
import { LineItem } from './LineItem';
import { useCart } from './use-cart';
import styles from './CartPage.module.css';

const FreightOptions = dynamic(() => import('@/components/freight/FreightOptions'));

/** "Sua carroça": lines, freight by CEP and the ledger (coupon + totals). */
export function CartPage({ serverCart }: { serverCart: CartView }) {
  const cart = useCart(serverCart);
  const count = cart.totals.itemCount;

  return (
    <section className={`${heading.container} ${styles.page}`}>
      <h1 className={`${heading.pageTitle} ${styles.title}`}>Sua carroça</h1>
      <p className={styles.count}>
        {count ? `${countLabel(count, 'item', 'itens')} no caixote` : 'Nenhum item ainda'}
      </p>
      {cart.lines.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>A carroça está vazia.</span>
          <span className={styles.emptyNote}>Até o burro está entediado.</span>
          <ButtonLink href="/mercadorias">Voltar às prateleiras</ButtonLink>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.main}>
            <div className={styles.notebook}>
              <div className={styles.notebookHead}>
                <span className={styles.notebookTitle}>Caderneta do freguez</span>
                <span className={styles.columns}>Mercadoria · Valor</span>
              </div>
              {cart.lines.map((line) => (
                <LineItem key={line.variantId} line={line} editable />
              ))}
            </div>
            <FreightBlock cart={cart} />
          </div>
          <Ledger cart={cart} />
        </div>
      )}
    </section>
  );
}

function FreightBlock({ cart }: { cart: CartView }) {
  const [cep, setCep] = useState(cart.cep ? maskCep(cart.cep) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await setDestination(cep);
    setError(result.ok ? null : result.error.message);
  };

  const pick = async (code: Parameters<typeof chooseFreight>[0]) => {
    const result = await chooseFreight(code);
    setError(result.ok ? null : result.error.message);
  };

  return (
    <div className={styles.freight}>
      <div className={styles.freightHead}>
        <h2 className={`${heading.subTitle} ${styles.freightTitle}`}>Frete</h2>
        <span className={styles.destination}>{destinationLabel(cart.destination)}</span>
      </div>
      <form className={styles.cepForm} onSubmit={(event) => void submit(event)}>
        <label htmlFor="cep-cart" className="visually-hidden">
          CEP
        </label>
        <input
          id="cep-cart"
          className={styles.cepInput}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Seu CEP"
          value={cep}
          aria-invalid={error !== null}
          onChange={(event) => setCep(maskCep(event.target.value))}
        />
        <Button type="submit" variant="brass" size="sm">
          Calcular
        </Button>
      </form>
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
      {cart.freightOptions.length > 0 && (
        <FreightOptions
          options={cart.freightOptions}
          selected={cart.selectedFreight}
          onSelect={(code) => void pick(code)}
          minColumn={210}
        />
      )}
    </div>
  );
}

function Ledger({ cart }: { cart: CartView }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; accepted: boolean } | null>(
    cart.coupon ? { text: cart.coupon.message, accepted: true } : null,
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setMessage({ text: 'Escreva o cupom antes, freguês.', accepted: false });
      return;
    }
    const result = await applyCoupon(code);
    setMessage(
      result.ok
        ? { text: result.data.coupon?.message ?? '', accepted: true }
        : { text: result.error.message, accepted: false },
    );
  };

  return (
    <aside aria-label="Resumo do pedido" className={styles.ledger}>
      <div className={styles.ledgerPaper}>
        <h2 className={styles.ledgerTitle}>Livro-caixa</h2>
        <form className={styles.coupon} onSubmit={(event) => void submit(event)}>
          <label htmlFor="cupom" className={styles.couponLabel}>
            Cupom do armazém
          </label>
          <div className={styles.couponRow}>
            <input
              id="cupom"
              className={styles.couponInput}
              placeholder="GALINHA10"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button type="submit" variant="dark" className={styles.couponApply}>
              Aplicar
            </Button>
          </div>
          {message && (
            <span
              role="status"
              className={`${styles.couponMessage} ${message.accepted ? styles.accepted : styles.refused}`}
            >
              {message.text}
            </span>
          )}
        </form>
        <div className={styles.ledgerTotals}>
          <CartTotals cart={cart} />
        </div>
        <ButtonLink href="/encomenda" size="lg" className={styles.checkout}>
          Finalizar encomenda
        </ButtonLink>
        <ButtonLink href="/mercadorias" variant="link">
          continuar comprando
        </ButtonLink>
      </div>
    </aside>
  );
}
