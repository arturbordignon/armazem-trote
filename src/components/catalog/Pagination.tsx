import type { Route } from 'next';
import Link from 'next/link';
import type { Pagination as PaginationData } from '@/models/catalog.types';
import styles from './Pagination.module.css';

type PageLink = (paging: { after?: string; before?: string; page?: number }) => Route;

/**
 * Brass-coin pagination over keyset cursors. Cursors can step one page either way (never jump to
 * page 40), so the coins show the neighbouring pages around the current one.
 */
export function Pagination({
  pagination,
  hrefFor,
}: {
  pagination: PaginationData;
  hrefFor: PageLink;
}) {
  const { page, pageCount, prevCursor, nextCursor } = pagination;
  if (pageCount <= 1) return null;

  // Page 1 needs no cursor: linking to it plainly keeps that URL canonical and cacheable.
  const previous = prevCursor
    ? hrefFor(page - 1 <= 1 ? {} : { before: prevCursor, page: page - 1 })
    : null;
  const next = nextCursor ? hrefFor({ after: nextCursor, page: page + 1 }) : null;

  return (
    <nav aria-label="Paginação" className={styles.nav}>
      {previous ? (
        <Link href={previous} className={styles.step} rel="prev">
          ← anterior
        </Link>
      ) : (
        <span className={styles.step} aria-disabled="true">
          ← anterior
        </span>
      )}
      {previous && (
        <Link
          href={previous}
          className={`${styles.coin} ${styles.other}`}
          aria-label={`Página ${page - 1}`}
        >
          {page - 1}
        </Link>
      )}
      <span aria-current="page" className={`${styles.coin} ${styles.current}`}>
        {page}
      </span>
      {next && (
        <Link
          href={next}
          className={`${styles.coin} ${styles.other}`}
          aria-label={`Página ${page + 1}`}
        >
          {page + 1}
        </Link>
      )}
      {next ? (
        <Link href={next} className={styles.step} rel="next">
          próxima →
        </Link>
      ) : (
        <span className={styles.step} aria-disabled="true">
          próxima →
        </span>
      )}
    </nav>
  );
}
