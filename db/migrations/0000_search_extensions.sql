-- Search building blocks. Runs before the schema because generated columns depend on them.

-- Strips accents so "lampiao" finds "Lampião".
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint

-- Trigram matching for typo-tolerant autocomplete ("lampiam" still finds "Lampião").
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- unaccent() is only STABLE (its dictionary could change), so it can't be used in generated
-- columns or index expressions. This wrapper pins the dictionary and is declared IMMUTABLE.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;--> statement-breakpoint

-- Portuguese full-text configuration that also folds accents before stemming,
-- so "café", "cafe" and "cafés" all reduce to the same lexeme.
CREATE TEXT SEARCH CONFIGURATION trote_pt (COPY = pg_catalog.portuguese);--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION trote_pt
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
