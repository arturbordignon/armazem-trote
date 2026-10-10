'use client';

import dynamic from 'next/dynamic';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { ProductDetail } from '@/models/catalog.types';
import { type FreightMethodCode, MAX_LINE_QUANTITY } from '@/models/constants';
import type { FreightQuote } from '@/models/freight.types';
import { addItem, openDrawer, rememberFreight } from '@/components/cart/cart-store';
import { destinationLabel, maskCep } from '@/components/freight/destination';
import { Button } from '@/components/ui/Button';
import styles from './Product.module.css';

// The animals' illustrations only load once there is a quote to show.
const FreightOptions = dynamic(() => import('@/components/freight/FreightOptions'));

interface ErrorBody {
  error?: { message?: string };
}

/** Variant, quantity, "Adicionar à carroça", stock, and "Calcular o frete". */
export function ProductPurchase({ product }: { product: ProductDetail }) {
  const [variantId, setVariantId] = useState(product.defaultVariant.id);
  const [quantity, setQuantity] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const available = variant?.available ?? 0;
  const maxQuantity = Math.max(1, Math.min(MAX_LINE_QUANTITY, available));

  const add = async () => {
    if (!variant) return;
    const added = await addItem(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        optionName: product.optionName,
        optionValue: variant.optionValue,
        unitPriceCents: product.priceCents,
        isBulky: product.isBulky,
      },
      quantity,
    );
    if (added) openDrawer();
  };

  return (
    <>
      {product.optionName && product.variants.length > 1 && (
        <fieldset className={styles.variants}>
          <legend className={styles.variantLegend}>
            {product.optionName}:{' '}
            <span className={styles.variantChosen}>{variant?.optionValue}</span>
          </legend>
          <div className={styles.variantList}>
            {product.variants.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.variant}
                aria-pressed={option.id === variantId}
                onClick={() => {
                  setVariantId(option.id);
                  setQuantity(1);
                }}
              >
                {option.optionValue}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className={styles.buy}>
        <div role="group" aria-label="Quantidade" className={styles.quantity}>
          <button
            type="button"
            className={styles.quantityStep}
            aria-label="Diminuir"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span aria-live="polite" className={styles.quantityValue}>
            {quantity}
          </span>
          <button
            type="button"
            className={styles.quantityStep}
            aria-label="Aumentar"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          >
            +
          </button>
        </div>
        <Button
          size="lg"
          className={styles.add}
          disabled={available <= 0}
          onClick={() => void add()}
        >
          Adicionar à carroça
        </Button>
      </div>
      <StockLine available={available} isBulky={product.isBulky} />
      <FreightCalculator slug={product.slug} quantity={quantity} />
    </>
  );
}

function StockLine({ available, isBulky }: { available: number; isBulky: boolean }) {
  if (available <= 0) {
    return (
      <span className={`${styles.stock} ${styles.soldOut}`}>
        Esgotado no paiol · volta com a próxima tropa
      </span>
    );
  }
  return (
    <span className={styles.stock}>
      ✓{' '}
      {isBulky
        ? 'Em estoque · sai do galpão dos fundos, só de charrete'
        : `Em estoque · ${available} ${available === 1 ? 'unidade' : 'unidades'} no paiol`}
    </span>
  );
}

/**
 * Quotes freight for this product and quantity. A newer request aborts an older one still in
 * flight, so a slow answer can never overwrite a fresher one. The quoted CEP and the picked
 * animal are kept in the cart, so the cart page opens already quoted.
 */
function FreightCalculator({ slug, quantity }: { slug: string; quantity: number }) {
  const [cep, setCep] = useState('');
  const [quotedCep, setQuotedCep] = useState('');
  const [quote, setQuote] = useState<FreightQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FreightMethodCode | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const calculate = async (event: FormEvent) => {
    event.preventDefault();
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const params = new URLSearchParams({ cep, produto: slug, qtd: String(quantity) });
    try {
      const response = await fetch(`/api/frete?${params.toString()}`, {
        signal: controller.signal,
      });
      const body = (await response.json()) as FreightQuote & ErrorBody;
      if (!response.ok) {
        setError(body.error?.message ?? 'Não deu para calcular agora. Tente de novo.');
        return;
      }
      setError(null);
      setQuote(body);
      setQuotedCep(cep);
      setCep(maskCep(body.destination.cepPrefix + cep.replace(/\D/g, '').slice(5)));
      void rememberFreight({ cep });
    } catch (failure) {
      if ((failure as Error).name !== 'AbortError')
        setError('Sem sinal do telégrafo. Tente de novo.');
    }
  };

  return (
    <div className={styles.freight}>
      <div className={styles.freightHead}>
        <h2 className={styles.freightTitle}>Calcular o frete</h2>
        <span className={styles.origin}>sahida: Ouro Fino, MG</span>
      </div>
      <form className={styles.cepForm} onSubmit={(event) => void calculate(event)}>
        <label htmlFor="cep-pdp" className="visually-hidden">
          CEP
        </label>
        <input
          id="cep-pdp"
          className={styles.cepInput}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          aria-invalid={error !== null}
          aria-describedby={error ? 'cep-pdp-error' : undefined}
          onChange={(event) => {
            setCep(maskCep(event.target.value));
            setError(null);
          }}
        />
        <Button type="submit" variant="brass" size="sm">
          Calcular
        </Button>
      </form>
      {error && (
        <span id="cep-pdp-error" role="alert" className={styles.error}>
          {error}
        </span>
      )}
      {quote ? (
        <>
          <span className={styles.destination}>{destinationLabel(quote.destination)}</span>
          <FreightOptions
            options={quote.options}
            selected={selected}
            onSelect={(method) => {
              setSelected(method);
              void rememberFreight({ cep: quotedCep, method });
            }}
          />
        </>
      ) : (
        <span className={styles.hint}>
          Experimente 01310-100 (São Paulo) ou 90010-000 (Porto Alegre).
        </span>
      )}
    </div>
  );
}
