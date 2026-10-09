import Link from 'next/link';
import { countLabel, formatBRL, formatRating } from '@/lib/format';
import type { ProductPage } from '@/models/catalog.types';
import { RATING_LEVELS } from '@/models/constants';
import { ProductShelf } from '@/components/catalog/ProductShelf';
import listing from '@/components/catalog/Listing.module.css';
import heading from '@/components/ui/Heading.module.css';
import { Horseshoes } from '@/components/ui/Horseshoes';
import { Price } from '@/components/ui/Price';
import { ProductGallery } from './ProductGallery';
import { ProductPurchase } from './ProductPurchase';
import styles from './Product.module.css';

/** "ou 3× de R$ 29,97 no fiado" */
const FIADO_INSTALLMENTS = 3;

export function ProductView({ page }: { page: ProductPage }) {
  const { product, reviews, related } = page;
  const totalRatings = product.ratingHistogram.reduce((sum, n) => sum + n, 0);
  const levels = Array.from({ length: RATING_LEVELS }, (_, i) => RATING_LEVELS - i);

  return (
    <section className={`${heading.container} ${styles.page}`}>
      <div>
        <nav aria-label="Trilha" className={styles.crumbs}>
          <ol className={listing.crumbs}>
            <li>
              <Link href="/">Armazém</Link>
            </li>
            <li>
              <Link href={`/secao/${product.section.slug}`}>{product.section.name}</Link>
            </li>
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>
        <div className={styles.top}>
          <ProductGallery name={product.name} badge={product.badge} />
          <div className={styles.info}>
            <span className={styles.section}>{product.section.name}</span>
            <h1 className={styles.name}>{product.name}</h1>
            <div className={styles.rating}>
              <Horseshoes rating={product.ratingAvg} size={21} />
              <span className={styles.ratingText}>
                {formatRating(product.ratingAvg)} ·{' '}
                {countLabel(product.ratingCount, 'avaliação', 'avaliações')}
              </span>
            </div>
            <div className={styles.priceTag}>
              <span aria-hidden="true" className={styles.hole} />
              <Price cents={product.priceCents} size="large" />
              {product.compareAtCents !== null && (
                <span className={styles.was}>
                  de <s>{formatBRL(product.compareAtCents)}</s> · economize{' '}
                  {formatBRL(product.compareAtCents - product.priceCents)}
                </span>
              )}
              <span className={styles.installments}>
                ou {FIADO_INSTALLMENTS}× de{' '}
                {formatBRL(Math.round(product.priceCents / FIADO_INSTALLMENTS))} no fiado
              </span>
            </div>
            <ProductPurchase product={product} />
          </div>
        </div>
      </div>

      <div className={`${styles.about} below-fold`}>
        <div>
          <h2 className={heading.subTitle}>Descripção</h2>
          <p className={styles.description}>{product.description}</p>
        </div>
        <div>
          <h2 className={heading.subTitle}>Ficha da mercadoria</h2>
          <dl className={styles.specs}>
            {product.specs.map(([label, value]) => (
              <div key={label} className={styles.spec}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div aria-labelledby="h-rev" className="below-fold">
        <h2 id="h-rev" className={styles.lettersTitle}>
          Cartas dos freguezes
        </h2>
        <div className={styles.letters}>
          <div className={styles.summary}>
            <span className={styles.summaryScore}>{formatRating(product.ratingAvg)}</span>
            <span className={styles.summaryText}>
              de {RATING_LEVELS} ferraduras ·{' '}
              {countLabel(product.ratingCount, 'avaliação', 'avaliações')}
            </span>
            <ul className={styles.bars} aria-label="Distribuição das notas">
              {levels.map((level) => {
                const share = totalRatings
                  ? (product.ratingHistogram[level - 1] ?? 0) / totalRatings
                  : 0;
                return (
                  <li key={level} className={styles.bar}>
                    <span>{level}</span>
                    <span className={styles.barTrack}>
                      <span className={styles.barFill} style={{ transform: `scaleX(${share})` }} />
                    </span>
                    <span className={styles.barShare}>{Math.round(share * 100)}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {reviews.map((review) => (
            <article key={review.id} className={styles.letter}>
              <Horseshoes rating={review.rating} />
              <h3 className={styles.letterTitle}>{review.title}</h3>
              <p className={styles.letterBody}>“{review.body}”</p>
              <span className={styles.signature}>{review.authorName}</span>
              <span className={styles.place}>{review.authorPlace}</span>
            </article>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <div className="below-fold">
          <h2 className={styles.lettersTitle}>Quem levou isso também levou</h2>
          <ProductShelf products={related} label="Quem levou isso também levou" />
        </div>
      )}
    </section>
  );
}
