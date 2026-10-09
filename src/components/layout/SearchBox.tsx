'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useState,
} from 'react';
import { formatBRL } from '@/lib/format';
import type { SearchSuggestion } from '@/models/catalog.types';
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from '@/models/constants';
import { ProductPhoto } from '@/components/ui/ProductPhoto';
import styles from './SearchBox.module.css';

/** Wait this long after the last keystroke before asking for suggestions. */
const DEBOUNCE_MS = 250;

interface Suggestions {
  term: string;
  items: SearchSuggestion[];
}

/**
 * Search with autocomplete. Suggestions are fetched only after typing pauses, and a newer term
 * aborts the request for an older one, so stale results can never overwrite fresh ones.
 */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  const term = query.trim();
  const showList = open && term.length >= SEARCH_MIN_LENGTH;
  const items = suggestions?.term === term ? suggestions.items : [];
  const loaded = suggestions?.term === term;

  useEffect(() => {
    if (term.length < SEARCH_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/busca/sugestoes?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) =>
          response.ok ? (response.json() as Promise<{ suggestions: SearchSuggestion[] }>) : null,
        )
        .then((body) => {
          if (body) setSuggestions({ term, items: body.suggestions });
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== 'AbortError') setSuggestions({ term, items: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const searchEverywhere = () => {
    if (!term) return;
    close();
    router.push(`/busca?q=${encodeURIComponent(term)}` as Route);
  };

  const pick = (suggestion: SearchSuggestion) => {
    close();
    router.push(`/mercadoria/${suggestion.slug}` as Route);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const chosen = items[active];
    if (chosen) pick(chosen);
    else searchEverywhere();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (event.key === 'Escape') {
      close();
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div className={styles.box} onBlur={onBlur}>
      <form role="search" className={styles.form} onSubmit={onSubmit}>
        <label htmlFor={`${listId}-input`} className="visually-hidden">
          Buscar no armazém
        </label>
        <input
          id={`${listId}-input`}
          className={styles.input}
          type="search"
          role="combobox"
          autoComplete="off"
          maxLength={SEARCH_MAX_LENGTH}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          placeholder="Procure lampião, café, ferradura…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={styles.submit} aria-label="Buscar">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" />
          </svg>
        </button>
      </form>
      {showList && (
        <ul id={listId} role="listbox" aria-label="Sugestões" className={styles.list}>
          {items.map((suggestion, index) => (
            <li
              key={suggestion.slug}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className={styles.option}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(suggestion);
              }}
            >
              <ProductPhoto name={suggestion.name} size="mini" />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{suggestion.name}</span>
                <span className={styles.optionSection}>{suggestion.sectionName}</span>
              </span>
              <span className={styles.optionPrice}>{formatBRL(suggestion.priceCents)}</span>
            </li>
          ))}
          {loaded && items.length === 0 && (
            <li role="presentation" className={styles.empty}>
              Nada no paiol com esse nome… ainda.
            </li>
          )}
          <li
            role="option"
            aria-selected={false}
            className={styles.everywhere}
            onMouseDown={(event) => {
              event.preventDefault();
              searchEverywhere();
            }}
          >
            Buscar “{term}” em todo o armazém →
          </li>
        </ul>
      )}
    </div>
  );
}
