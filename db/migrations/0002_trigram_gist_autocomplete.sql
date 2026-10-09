-- Autocomplete needs the top 5 names closest to what's been typed so far. GIN can only find
-- matches; it then scores and sorts all of them (measured: 63 ms for "ca" over 3,400 matches
-- in 10k products). GiST supports index-ordered nearest-neighbour search with <<->, returning
-- the top rows straight from the index (13.6 ms) and is less than half the size.
DROP INDEX "products_search_name_trgm_idx";--> statement-breakpoint
-- Autocomplete (KNN by word distance) and the typo fallback on the search results page.
CREATE INDEX "products_search_name_trgm_idx" ON "products" USING gist ("search_name" gist_trgm_ops);--> statement-breakpoint

-- Default word-similarity cutoff (0.6) rejects common slips such as "lampioes" vs "lampião"
-- (0.56). 0.5 keeps those while still filtering noise. Set per database so every pooled
-- session gets it without a per-query SET.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET pg_trgm.word_similarity_threshold = 0.5', current_database());
END
$$;
