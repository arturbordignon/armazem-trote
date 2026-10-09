import { formatBRL } from '@/lib/format';
import type { CartView } from '@/models/cart.types';
import { freightPriceLabel } from '@/components/freight/FreightOptionCard';
import styles from './CartTotals.module.css';

/** Subtotal, discount, freight and total, as computed by the server. */
export function CartTotals({ cart, compact = false }: { cart: CartView; compact?: boolean }) {
  const { totals } = cart;
  const freight = cart.freightOptions.find((option) => option.code === cart.selectedFreight);
  return (
    <dl className={`${styles.list} ${compact ? styles.compact : ''}`}>
      <div className={styles.row}>
        <dt>Subtotal</dt>
        <dd>{formatBRL(totals.subtotalCents)}</dd>
      </div>
      {totals.discountCents > 0 && (
        <div className={styles.row}>
          <dt>Desconto</dt>
          <dd>− {formatBRL(totals.discountCents)}</dd>
        </div>
      )}
      <div className={styles.row}>
        <dt>Frete</dt>
        <dd>
          {freight ? `${freightPriceLabel(freight.priceCents)} · ${freight.name}` : 'a calcular'}
        </dd>
      </div>
      <div className={`${styles.row} ${styles.total}`}>
        <dt>Total</dt>
        <dd>{formatBRL(totals.totalCents)}</dd>
      </div>
    </dl>
  );
}
