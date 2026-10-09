import Link from 'next/link';
import { countLabel, formatBRL } from '@/lib/format';
import type { ListingPage } from '@/models/catalog.types';
import type { FitFilter } from '@/models/constants';
import { DEFAULT_FIT } from '@/validators/listing-params';
import heading from '@/components/ui/Heading.module.css';
import { ButtonLink } from '@/components/ui/Button';
import { ListingLayout } from './ListingLayout';
import { Pagination } from './Pagination';
import { ProductShelf } from './ProductShelf';
import { listingHref } from './listing-url';
import styles from './Listing.module.css';

const FIT_CHIPS: Readonly<Record<FitFilter, string | null>> = {
  'tanto-faz': null,
  lombo: 'Cabe no lombo',
  charrete: 'Só de charrete',
};

/** A product listing ("Todas as mercadorias", a section, or several sections). */
export function ListingView({ page }: { page: ListingPage }) {
  const { filters } = page;
  const fitChip = FIT_CHIPS[filters.fit];
  const sectionNames = new Map(page.sectionFacets.map((s) => [s.slug, s.name]));
  if (page.section) sectionNames.set(page.section.current.slug, page.section.current.name);

  const chips = [
    ...filters.sections.map((slug) => ({
      label: sectionNames.get(slug) ?? slug,
      href: listingHref({ ...filters, sections: filters.sections.filter((s) => s !== slug) }),
    })),
    ...(filters.maxPriceCents !== null
      ? [
          {
            label: `Até ${formatBRL(filters.maxPriceCents)}`,
            href: listingHref({ ...filters, maxPriceCents: null }),
          },
        ]
      : []),
    ...(fitChip ? [{ label: fitChip, href: listingHref({ ...filters, fit: DEFAULT_FIT }) }] : []),
  ];
  const cleared = listingHref({
    sections: [],
    maxPriceCents: null,
    fit: DEFAULT_FIT,
    sort: filters.sort,
  });

  return (
    <section className={`${heading.container} ${styles.page}`}>
      <nav aria-label="Trilha">
        <ol className={styles.crumbs}>
          <li>
            <Link href="/">Armazém</Link>
          </li>
          {page.section?.parent && (
            <li>
              <Link href={`/secao/${page.section.parent.slug}`}>{page.section.parent.name}</Link>
            </li>
          )}
          <li aria-current="page">{page.title}</li>
        </ol>
      </nav>
      <ListingLayout
        filters={filters}
        facets={page.sectionFacets}
        activeFilterCount={chips.length}
        heading={
          <>
            <h1 className={heading.pageTitle}>{page.title}</h1>
            <span className={styles.count}>
              {countLabel(page.total, 'mercadoria', 'mercadorias')} · página {page.page} de{' '}
              {page.pageCount}
            </span>
          </>
        }
        chips={
          <>
            {page.section && page.section.children.length > 0 && (
              <nav aria-label="Subseções" className={styles.subsections}>
                {page.section.children.map((child) => (
                  <Link key={child.slug} href={`/secao/${child.slug}`} className={styles.chip}>
                    {child.name}
                  </Link>
                ))}
              </nav>
            )}
            {chips.length > 0 && (
              <div className={styles.chips}>
                {chips.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.href}
                    className={styles.chip}
                    aria-label={`Remover filtro ${chip.label}`}
                  >
                    {chip.label} <span aria-hidden="true">×</span>
                  </Link>
                ))}
                <Link href={cleared} className={styles.clear}>
                  limpar tudo
                </Link>
              </div>
            )}
          </>
        }
      >
        {page.items.length > 0 ? (
          <>
            <ProductShelf products={page.items} label={page.title} />
            <Pagination pagination={page} hrefFor={(paging) => listingHref(filters, paging)} />
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>Prateleira vazia</span>
            <span className={styles.emptyText}>
              Com esses filtros, nem o caixeiro achou mercadoria. Afrouxe as rédeas.
            </span>
            <ButtonLink href={cleared} size="md">
              Limpar filtros
            </ButtonLink>
          </div>
        )}
      </ListingLayout>
    </section>
  );
}
