'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { formatBRL } from '@/lib/format';
import type { ListingFilters, Section } from '@/models/catalog.types';
import {
  type FitFilter,
  type ListingSort,
  PRICE_FILTER_MAX_CENTS,
  PRICE_FILTER_MIN_CENTS,
  PRICE_FILTER_STEP_CENTS,
} from '@/models/constants';
import { Button } from '@/components/ui/Button';
import { ListingSkeleton } from './ListingSkeleton';
import { listingHref } from './listing-url';
import styles from './Listing.module.css';

const SORT_OPTIONS: readonly [ListingSort, string][] = [
  ['relevancia', 'Relevância'],
  ['menor-preco', 'Menor preço'],
  ['maior-preco', 'Maior preço'],
  ['ferraduras', 'Mais ferraduras'],
];

const FIT_OPTIONS: readonly [FitFilter, string][] = [
  ['tanto-faz', 'Tanto faz'],
  ['lombo', 'Cabe no lombo (burro ou cavalo)'],
  ['charrete', 'Só de charrete'],
];

/** Let the slider settle before reloading the shelf. */
const PRICE_DEBOUNCE_MS = 300;

interface ListingLayoutProps {
  filters: ListingFilters;
  facets: (Section & { productCount: number })[];
  activeFilterCount: number;
  heading: ReactNode;
  chips: ReactNode;
  children: ReactNode;
}

/**
 * The interactive frame around a listing: sort, filter notebook, and the skeleton shown while
 * the next shelf loads. Every change is just a navigation to the listing's canonical URL; the
 * products themselves are server-rendered and passed in as children.
 */
export function ListingLayout({
  filters,
  facets,
  activeFilterCount,
  heading,
  chips,
  children,
}: ListingLayoutProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filtersShown, setFiltersShown] = useState<'auto' | 'open' | 'closed'>('auto');
  const [priceCents, setPriceCents] = useState(filters.maxPriceCents ?? PRICE_FILTER_MAX_CENTS);
  const priceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL's price filter changes (chip removed, back button), the slider follows. Adjusting
  // state during render, rather than in an effect, avoids a second render pass.
  const [urlPrice, setUrlPrice] = useState(filters.maxPriceCents);
  if (urlPrice !== filters.maxPriceCents) {
    setUrlPrice(filters.maxPriceCents);
    setPriceCents(filters.maxPriceCents ?? PRICE_FILTER_MAX_CENTS);
  }

  useEffect(() => () => clearTimeout(priceTimer.current), []);

  const go = (next: Partial<ListingFilters>) => {
    startTransition(() => router.push(listingHref({ ...filters, ...next }), { scroll: false }));
  };

  const toggleSection = (slug: string) => {
    const sections = filters.sections.includes(slug)
      ? filters.sections.filter((s) => s !== slug)
      : [...filters.sections, slug];
    go({ sections });
  };

  const changePrice = (cents: number) => {
    setPriceCents(cents);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(
      () => go({ maxPriceCents: cents >= PRICE_FILTER_MAX_CENTS ? null : cents }),
      PRICE_DEBOUNCE_MS,
    );
  };

  const toggleFilters = () =>
    setFiltersShown((shown) => {
      const wide = window.matchMedia('(min-width: 820px)').matches;
      const open = shown === 'auto' ? wide : shown === 'open';
      return open ? 'closed' : 'open';
    });

  const counter = activeFilterCount > 0 ? ` (${activeFilterCount})` : '';
  const openLabel = `Esconder filtros${counter}`;
  const closedLabel = `Mostrar filtros${counter}`;

  return (
    <>
      <div className={styles.header}>
        <div>{heading}</div>
        <div className={styles.controls}>
          <Button
            variant="brass"
            size="sm"
            onClick={toggleFilters}
            aria-expanded={filtersShown !== 'closed'}
          >
            {filtersShown === 'auto' ? (
              <>
                <span className={styles.toggleWide}>{openLabel}</span>
                <span className={styles.toggleNarrow}>{closedLabel}</span>
              </>
            ) : filtersShown === 'open' ? (
              openLabel
            ) : (
              closedLabel
            )}
          </Button>
          <label className={styles.sortLabel}>
            Ordenar
            <select
              className={styles.select}
              value={filters.sort}
              onChange={(event) => go({ sort: event.target.value as ListingSort })}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {chips}
      <div className={styles.body} data-filters={filtersShown}>
        <aside aria-label="Filtros" className={styles.filters}>
          <span className={styles.notebookTitle}>Caderneta de escolha</span>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Secção</legend>
            {facets.map((facet) => (
              <label key={facet.slug} className={styles.option}>
                <input
                  type="checkbox"
                  checked={filters.sections.includes(facet.slug)}
                  onChange={() => toggleSection(facet.slug)}
                />
                <span className={styles.optionName}>{facet.name}</span>
                <span className={styles.optionCount}>{facet.productCount}</span>
              </label>
            ))}
          </fieldset>
          <div className={styles.price}>
            <label htmlFor="preco" className={styles.priceLabel}>
              Preço até <span className={styles.priceValue}>{formatBRL(priceCents)}</span>
            </label>
            <input
              id="preco"
              className={styles.range}
              type="range"
              min={PRICE_FILTER_MIN_CENTS}
              max={PRICE_FILTER_MAX_CENTS}
              step={PRICE_FILTER_STEP_CENTS}
              value={priceCents}
              onChange={(event) => changePrice(Number(event.target.value))}
            />
            <div className={styles.rangeEnds}>
              <span>{formatBRL(PRICE_FILTER_MIN_CENTS).replace(',00', '')}</span>
              <span>{formatBRL(PRICE_FILTER_MAX_CENTS).replace(',00', '')}</span>
            </div>
          </div>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Cabe na charrete?</legend>
            {FIT_OPTIONS.map(([value, label]) => (
              <label key={value} className={styles.option}>
                <input
                  type="radio"
                  name="fit"
                  checked={filters.fit === value}
                  onChange={() => go({ fit: value })}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </aside>
        <div className={styles.results}>{isPending ? <ListingSkeleton /> : children}</div>
      </div>
    </>
  );
}
