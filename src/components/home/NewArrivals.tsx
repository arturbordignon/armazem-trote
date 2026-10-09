import type { ProductCard as ProductCardData } from '@/models/catalog.types';
import { ProductCard } from '@/components/catalog/ProductCard';
import heading from '@/components/ui/Heading.module.css';
import { ShelfCarousel } from './ShelfCarousel';
import styles from './HomeSections.module.css';

/** "Novidades da Semana": the newest arrivals on a scrolling shelf. */
export function NewArrivals({ products }: { products: readonly ProductCardData[] }) {
  return (
    <section
      aria-labelledby="h-novidades"
      className={`${heading.container} ${styles.arrivals} below-fold`}
    >
      <ShelfCarousel
        heading={
          <div className={styles.arrivalsTitle}>
            <div className={styles.chalkboard}>Chegou no vapor!</div>
            <h2 id="h-novidades" className={heading.title}>
              Novidades da Semana
            </h2>
          </div>
        }
      >
        {products.map((product) => (
          <li key={product.id} className={styles.trackItem}>
            <div className={styles.hanger}>
              <ProductCard product={product} />
            </div>
            <div aria-hidden="true" className={styles.plank} />
          </li>
        ))}
      </ShelfCarousel>
    </section>
  );
}
