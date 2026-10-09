// Read models returned by catalog services. Plain, JSON-serializable data: they are cached in
// Redis and in Next's `use cache` store, and handed to client components as props.
import type { ProductSpec } from './catalog.schema';
import type { FitFilter, FreightMethodCode, ListingSort } from './constants';

export interface Section {
  id: number;
  slug: string;
  name: string;
}

export interface SectionNode extends Section {
  parentId: number | null;
  /** Active products in this section and all of its descendants. */
  productCount: number;
  children: SectionNode[];
}

/** Everything a product card (the hanging tag) needs, plus what "add to cart" needs. */
export interface ProductCard {
  id: number;
  slug: string;
  name: string;
  /** Top-level section, as printed on the card ("Iluminação"). */
  sectionName: string;
  priceCents: number;
  compareAtCents: number | null;
  badge: string | null;
  isBulky: boolean;
  ratingAvg: number;
  ratingCount: number;
  /** First variant by position: what "Adicionar à carroça" on a card adds. */
  defaultVariant: { id: number; optionValue: string | null };
  optionName: string | null;
}

export interface ProductVariant {
  id: number;
  optionValue: string | null;
  /** Units on hand minus units reserved by placed orders. */
  available: number;
}

export interface ProductDetail extends ProductCard {
  description: string;
  section: Section;
  leafSection: Section;
  weightGrams: number;
  specs: ProductSpec[];
  /** Review counts per horseshoe level, index 0 = 1 horseshoe. */
  ratingHistogram: number[];
  variants: ProductVariant[];
}

export interface Review {
  id: number;
  authorName: string;
  authorPlace: string;
  rating: number;
  title: string;
  body: string;
}

export interface ProductPage {
  product: ProductDetail;
  reviews: Review[];
  related: ProductCard[];
}

export interface FreightMethodSummary {
  code: FreightMethodCode;
  name: string;
  tier: string;
  description: string;
  minDays: number;
  maxDays: number;
  isFree: boolean;
}

export interface HomePage {
  sections: (Section & { productCount: number })[];
  newArrivals: ProductCard[];
  freightMethods: FreightMethodSummary[];
}

export interface Pagination {
  page: number;
  pageCount: number;
  total: number;
  /** Opaque keyset cursors; null when there is no page in that direction. */
  nextCursor: string | null;
  prevCursor: string | null;
}

export interface ListingFilters {
  /** Section slugs (top-level or leaf); empty = every section. */
  sections: string[];
  maxPriceCents: number | null;
  fit: FitFilter;
  sort: ListingSort;
}

export interface ListingPage extends Pagination {
  title: string;
  /** Set when the listing is exactly one section: breadcrumb and sub-section chips. */
  section: { current: Section; parent: Section | null; children: Section[] } | null;
  filters: ListingFilters;
  items: ProductCard[];
  /** Every top-level section with its total product count, for the filter sidebar. */
  sectionFacets: (Section & { productCount: number })[];
}

export interface SearchSuggestion {
  slug: string;
  name: string;
  sectionName: string;
  priceCents: number;
}

export interface SearchPage extends Pagination {
  query: string;
  items: ProductCard[];
}
