import Link from 'next/link';
import { countLabel } from '@/lib/format';
import type { SearchPage } from '@/models/catalog.types';
import heading from '@/components/ui/Heading.module.css';
import { Pagination } from './Pagination';
import { ProductShelf } from './ProductShelf';
import { searchHref } from './listing-url';
import styles from './SearchResults.module.css';

const SUGGESTED_TERMS = ['Lampião', 'Café', 'Ferradura', 'Chapéu'];

export function SearchResults({ page }: { page: SearchPage }) {
  const found = page.total > 0;
  return (
    <section className={`${heading.container} ${styles.page}`}>
      <span className={heading.kicker}>Resultado da busca</span>
      <h1 className={styles.query}>“{page.query}”</h1>
      <p className={styles.count}>
        {found
          ? countLabel(page.total, 'mercadoria encontrada', 'mercadorias encontradas')
          : 'Nenhuma mercadoria encontrada'}
      </p>
      {found ? (
        <div className={styles.results}>
          <ProductShelf products={page.items} label={`Resultados para ${page.query}`} />
          <Pagination pagination={page} hrefFor={(paging) => searchHref(page.query, paging)} />
        </div>
      ) : (
        <div className={styles.telegram}>
          <div className={styles.telegramHead}>
            <span className={styles.telegramBrand}>TELEGRAMMA</span>
            <span className={styles.urgent}>URGENTE</span>
          </div>
          <div className={styles.telegramBody}>
            <p className={styles.telegramTitle}>Nem o telegrafista encontrou isso.</p>
            <p className={styles.telegramText}>
              Procuramos “{page.query}” do paiol ao sótão STOP Nada STOP Tente outra palavra ou
              espie as sugestões abaixo STOP
            </p>
            <div className={styles.terms}>
              {SUGGESTED_TERMS.map((term) => (
                <Link key={term} href={searchHref(term)} className={styles.term}>
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
