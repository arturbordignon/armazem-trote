// URL vocabulary for listings and search. No zod here: client components import these to build
// links, and shouldn't pull the schemas into the browser bundle for a few strings.
import type { FitFilter, ListingSort } from '@/models/constants';

/** Query-string names for listings and search (Portuguese, like the rest of the URLs). */
export const LISTING_PARAMS = {
  sections: 'secao',
  maxPrice: 'preco',
  fit: 'cabe',
  sort: 'ordem',
  after: 'depois',
  before: 'antes',
  page: 'pagina',
  query: 'q',
} as const;

export const DEFAULT_SORT: ListingSort = 'relevancia';
export const DEFAULT_FIT: FitFilter = 'tanto-faz';
