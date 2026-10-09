import type { NextConfig } from 'next';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Static shell + streamed dynamic islands (the cart), `use cache` for catalog pages.
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Catalog pages: invalidated by tag on product/price/stock changes, so a long lifetime is
    // safe; the time-based refresh is only a backstop.
    catalog: { stale: 5 * MINUTE, revalidate: HOUR, expire: DAY },
    // Section tree and navigation change only when the catalog is restructured.
    navigation: { stale: HOUR, revalidate: DAY, expire: 7 * DAY },
  },
  // Pin the workspace root so stray lockfiles in parent folders are never picked up.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
