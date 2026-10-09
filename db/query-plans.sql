-- Hot query paths, as the repositories issue them, at full catalog size.
-- Run with `pnpm db:explain` (development database). Read-only: the stock lock rolls back.
\timing off
\pset pager off

\echo '== Listing: everything, default order (Relevância), first page'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT p.id, p.slug FROM products p JOIN variants v ON v.product_id = p.id AND v.position = 0
WHERE p.is_active ORDER BY p.popularity DESC, p.id DESC LIMIT 25;

\echo '== Listing: one section (4 leaves), Maior preço, deep keyset page'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT p.id FROM products p JOIN variants v ON v.product_id = p.id AND v.position = 0
WHERE p.is_active AND p.category_id IN (SELECT id FROM categories WHERE parent_id = (SELECT id FROM categories WHERE slug = 'mantimentos'))
  AND (p.price_cents, p.id) < (5000, 4000)
ORDER BY p.price_cents DESC, p.id DESC LIMIT 25;

\echo '== Listing: count for the same section with a price cap and only bulky goods'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT count(*) FROM products
WHERE is_active AND category_id IN (SELECT id FROM categories WHERE parent_id IS NOT NULL) AND price_cents <= 150000 AND is_bulky;

\echo '== Search results: full text OR trigram, ranked, first page ("cafe")'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT id FROM products
WHERE is_active AND (search_vector @@ websearch_to_tsquery('trote_pt', 'cafe') OR f_unaccent(lower('cafe')) <% search_name)
ORDER BY ((ts_rank(search_vector, websearch_to_tsquery('trote_pt', 'cafe')) + word_similarity(f_unaccent(lower('cafe')), search_name)) * (1 + 0.1 * log(1 + popularity))) DESC, id DESC
LIMIT 25;

\echo '== Autocomplete, word prefix ("lamp")'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT slug FROM products WHERE is_active AND search_name ~ '(^| )lamp' ORDER BY popularity DESC, id DESC LIMIT 5;

\echo '== Autocomplete, typo fallback ("lampiam"): GiST nearest neighbours'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT slug FROM products WHERE is_active AND f_unaccent(lower('lampiam')) <% search_name
ORDER BY search_name <->> f_unaccent(lower('lampiam')), popularity DESC LIMIT 10;

\echo '== Product page: variants with stock, by slug'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT v.id, i.on_hand - i.reserved FROM variants v JOIN products p ON p.id = v.product_id
JOIN inventory i ON i.variant_id = v.id WHERE p.slug = 'lampiao' ORDER BY v.position;

\echo '== Product page: latest letters, by slug'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT r.id FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.slug = 'lampiao'
ORDER BY r.created_at DESC, r.id DESC LIMIT 3;

\echo '== Product page: related best sellers in the same leaf section'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT p.id FROM products p JOIN variants v ON v.product_id = p.id AND v.position = 0
WHERE p.is_active AND p.category_id IN (SELECT category_id FROM products WHERE slug = 'lampiao') AND p.slug <> 'lampiao'
ORDER BY p.popularity DESC, p.id DESC LIMIT 4;

\echo '== Cart: hydrate 10 lines in one query'
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT v.id, p.name, p.price_cents, i.on_hand - i.reserved FROM variants v
JOIN products p ON p.id = v.product_id JOIN inventory i ON i.variant_id = v.id
WHERE v.id IN (1, 7, 42, 99, 512, 1024, 2048, 4096, 8192, 16000) AND p.is_active;

\echo '== Checkout: lock stock rows in id order (rolled back)'
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)
SELECT variant_id, on_hand, reserved FROM inventory WHERE variant_id IN (42, 7, 99) ORDER BY variant_id FOR UPDATE;
ROLLBACK;
