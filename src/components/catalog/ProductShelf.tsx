import type { ProductCard as ProductCardData } from '@/models/catalog.types';
import { ProductCard } from './ProductCard';
import styles from './ProductShelf.module.css';

/** A responsive grid of product tags, each hanging over its stretch of shelf. */
export function ProductShelf({
  products,
  label,
}: {
  products: readonly ProductCardData[];
  label?: string;
}) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {products.map((product) => (
        <li key={product.id} className={styles.slot}>
          <div className={styles.hanger}>
            <ProductCard product={product} />
          </div>
          <div className={styles.plank} aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
