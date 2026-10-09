'use client';

import Link from 'next/link';
import { formatBRL } from '@/lib/format';
import type { CartLine } from '@/models/cart.types';
import { MAX_LINE_QUANTITY } from '@/models/constants';
import { ProductPhoto } from '@/components/ui/ProductPhoto';
import { closeDrawer, removeLine, setQuantity } from './cart-store';
import styles from './LineItem.module.css';

/** What a read-only line shows (order lines on the confirmation telegram fit too). */
export interface LineItemData {
  productSlug?: string;
  productName: string;
  optionName: string | null;
  optionValue: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export function variantLabel(
  line: Pick<LineItemData, 'optionName' | 'optionValue'>,
): string | null {
  return line.optionValue ? `${line.optionName ?? 'Opção'}: ${line.optionValue}` : null;
}

type LineItemProps = { line: CartLine; editable: true } | { line: LineItemData; editable?: false };

/** A notebook line. Editable lines change the cart through the store (optimistically). */
export function LineItem(props: LineItemProps) {
  const { line } = props;
  const variant = variantLabel(line);
  const href = line.productSlug ? (`/mercadoria/${line.productSlug}` as const) : null;

  return (
    <div className={styles.line}>
      {href ? (
        <Link
          href={href}
          className={styles.thumb}
          onClick={closeDrawer}
          aria-label={`Ver ${line.productName}`}
        >
          <ProductPhoto name={line.productName} size="thumb" />
        </Link>
      ) : (
        <span className={styles.thumb}>
          <ProductPhoto name={line.productName} size="thumb" />
        </span>
      )}
      <div className={styles.details}>
        {href ? (
          <Link href={href} className={styles.name} onClick={closeDrawer}>
            {line.productName}
          </Link>
        ) : (
          <span className={styles.name}>{line.productName}</span>
        )}
        {variant && <span className={styles.variant}>{variant}</span>}
        {props.editable ? (
          <div className={styles.controls}>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.step}
                aria-label="Diminuir quantidade"
                onClick={() => void setQuantity(props.line.variantId, line.quantity - 1)}
              >
                −
              </button>
              <span className={styles.quantity} aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                className={styles.step}
                aria-label="Aumentar quantidade"
                disabled={line.quantity >= MAX_LINE_QUANTITY}
                onClick={() => void setQuantity(props.line.variantId, line.quantity + 1)}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={styles.remove}
              onClick={() => void removeLine(props.line)}
            >
              riscar da caderneta
            </button>
          </div>
        ) : (
          <span className={styles.readonly}>Qtd. {line.quantity}</span>
        )}
      </div>
      <div className={styles.amounts}>
        <span className={styles.total}>{formatBRL(line.lineTotalCents)}</span>
        <span className={styles.unit}>{formatBRL(line.unitPriceCents)} cada</span>
      </div>
    </div>
  );
}
