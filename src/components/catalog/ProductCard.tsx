import Link from 'next/link';
import { formatBRL } from '@/lib/format';
import type { ProductCard as ProductCardData } from '@/models/catalog.types';
import { Horseshoes } from '@/components/ui/Horseshoes';
import { Price } from '@/components/ui/Price';
import { ProductPhoto } from '@/components/ui/ProductPhoto';
import { Stamp } from '@/components/ui/Stamp';
import { AddToCartButton } from './AddToCartButton';
import styles from './ProductCard.module.css';

/** The hanging price tag used on every shelf. Server-rendered; only the button hydrates. */
export function ProductCard({ product }: { product: ProductCardData }) {
  const href = `/mercadoria/${product.slug}` as const;
  return (
    <div className={styles.shadow}>
      <article className={styles.tag}>
        <span className={styles.eyelet} aria-hidden="true" />
        {/* Same destination as the name link below: hidden from keyboard and screen readers. */}
        <Link href={href} className={styles.photo} tabIndex={-1} aria-hidden="true">
          <ProductPhoto name={product.name} size="card" />
          <span className={styles.credit}>Photographia Trote</span>
          {product.badge && <Stamp>{product.badge}</Stamp>}
        </Link>
        <span className={styles.section}>{product.sectionName}</span>
        <Link href={href} className={styles.name}>
          {product.name}
        </Link>
        <div className={styles.rating}>
          <Horseshoes rating={product.ratingAvg} />
          <span className={styles.count}>({product.ratingCount})</span>
        </div>
        <div className={styles.prices}>
          <Price cents={product.priceCents} />
          {product.compareAtCents !== null && (
            <s className={styles.was}>{formatBRL(product.compareAtCents)}</s>
          )}
        </div>
        {product.isBulky && <span className={styles.bulky}>Só de charrete</span>}
        <AddToCartButton
          className={styles.add}
          line={{
            variantId: product.defaultVariant.id,
            productSlug: product.slug,
            productName: product.name,
            optionName: product.optionName,
            optionValue: product.defaultVariant.optionValue,
            unitPriceCents: product.priceCents,
            isBulky: product.isBulky,
          }}
        />
      </article>
    </div>
  );
}
