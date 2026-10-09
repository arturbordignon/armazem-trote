import type { ProductSpec } from '@/models/catalog.schema';
import type { coupons, freightMethods } from '@/models/commerce.schema';

export interface SeedSection {
  slug: string;
  name: string;
  children: readonly { slug: string; name: string }[];
}

export interface SeedReview {
  authorName: string;
  authorPlace: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
}

export interface SeedVariant {
  sku: string;
  /** Null for the single default variant of a product without options. */
  optionValue: string | null;
  stock: number;
}

export interface SeedProduct {
  slug: string;
  name: string;
  description: string;
  /** Slug of the leaf section the product belongs to. */
  categorySlug: string;
  priceCents: number;
  compareAtCents: number | null;
  optionName: string | null;
  variants: SeedVariant[];
  badge: string | null;
  isBulky: boolean;
  weightGrams: number;
  specs: ProductSpec[];
  searchKeywords: string;
  ratingAvg: number;
  ratingCount: number;
  ratingHistogram: number[];
  popularity: number;
  arrivedAt: Date;
  reviews: SeedReview[];
}

export interface SeedCatalog {
  sections: readonly SeedSection[];
  products: SeedProduct[];
  freightMethods: readonly (typeof freightMethods.$inferInsert)[];
  coupons: readonly (typeof coupons.$inferInsert)[];
}
