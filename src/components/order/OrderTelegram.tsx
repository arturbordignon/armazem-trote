import { formatBRL } from '@/lib/format';
import { PAYMENT_OPTIONS } from '@/models/constants';
import type { OrderConfirmation } from '@/models/order.types';
import { LineItem } from '@/components/cart/LineItem';
import { ButtonLink } from '@/components/ui/Button';
import { TrackingMap } from './TrackingMap';
import styles from './Order.module.css';

/** "Sua encomenda partiu ao raiar do dia": the confirmation telegram and the road map. */
export function OrderTelegram({ order }: { order: OrderConfirmation }) {
  const firstName = order.customerName.trim().split(/\s+/)[0] ?? 'freguês';
  const eta = `${order.freightMinDays}–${order.freightMaxDays} dias`;
  const freight = order.freightCents === 0 ? 'Grátis' : formatBRL(order.freightCents);
  return (
    <section className={styles.page}>
      <div className={styles.telegram}>
        <div className={styles.head}>
          <span className={styles.brand}>TELEGRAMMA</span>
          <span className={styles.office}>
            Repartição Geral dos Telegraphos · Nº {order.number}
          </span>
        </div>
        <div className={styles.body}>
          <h1 className={styles.headline}>Sua encomenda partiu ao raiar do dia.</h1>
          <p className={styles.message}>
            Prezado(a) {firstName} STOP Encomenda embarcada no lombo do {order.freightMethodName}{' '}
            rumo a {order.city} {order.uf} STOP Previsão de chegada {eta} STOP Pagamento:{' '}
            {PAYMENT_OPTIONS[order.paymentMethod].label} STOP
          </p>
          <div className={styles.lines}>
            {order.lines.map((line, index) => (
              <LineItem key={`${line.productName}-${index}`} line={line} />
            ))}
          </div>
          <dl className={styles.totals}>
            <dt>SUBTOTAL</dt>
            <dd>{formatBRL(order.subtotalCents)}</dd>
            {order.discountCents > 0 && (
              <>
                <dt>DESCONTO</dt>
                <dd>− {formatBRL(order.discountCents)}</dd>
              </>
            )}
            <dt>FRETE ({order.freightMethodName.toUpperCase()})</dt>
            <dd>{freight}</dd>
            <dt className={styles.grand}>TOTAL</dt>
            <dd className={styles.grand}>{formatBRL(order.totalCents)}</dd>
          </dl>
        </div>
      </div>
      <TrackingMap
        method={order.freightMethod}
        leagues={order.leagues}
        destination={`${order.city} (${order.uf})`}
      />
      <ButtonLink href="/" className={styles.home}>
        Voltar ao armazém
      </ButtonLink>
    </section>
  );
}
