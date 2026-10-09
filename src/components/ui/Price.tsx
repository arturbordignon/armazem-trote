import { formatBRL, splitPrice } from '@/lib/format';
import styles from './Price.module.css';

/** "R$ 1.290,00" engraved: small currency, big reais, raised cents. */
export function Price({ cents, size = 'card' }: { cents: number; size?: 'card' | 'large' }) {
  const { reais, cents: centavos } = splitPrice(cents);
  return (
    <span
      className={`${styles.price} ${size === 'large' ? styles.large : ''}`}
      aria-label={formatBRL(cents)}
    >
      <span className={styles.currency} aria-hidden="true">
        R$
      </span>
      <span className={styles.reais} aria-hidden="true">
        {reais}
      </span>
      <span className={styles.cents} aria-hidden="true">
        ,{centavos}
      </span>
    </span>
  );
}
