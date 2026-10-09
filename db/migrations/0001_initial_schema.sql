CREATE TYPE "public"."coupon_kind" AS ENUM('percent_off', 'amount_off', 'free_freight');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('placed', 'dispatched', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cocheiro', 'fiado', 'galinhas');--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1888 CACHE 1;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"parent_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"variant_id" integer PRIMARY KEY NOT NULL,
	"on_hand" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_on_hand_nonnegative" CHECK ("inventory"."on_hand" >= 0),
	CONSTRAINT "inventory_reserved_within_on_hand" CHECK ("inventory"."reserved" BETWEEN 0 AND "inventory"."on_hand")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category_id" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"compare_at_cents" integer,
	"option_name" text,
	"badge" text,
	"is_bulky" boolean DEFAULT false NOT NULL,
	"weight_grams" integer NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_keywords" text DEFAULT '' NOT NULL,
	"rating_avg" numeric(2, 1) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"rating_histogram" integer[] DEFAULT '{0,0,0,0,0}'::integer[] NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"arrived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_name" text GENERATED ALWAYS AS (f_unaccent(lower(name))) STORED,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('trote_pt'::regconfig, name), 'A')
        || setweight(to_tsvector('trote_pt'::regconfig, search_keywords), 'B')
        || setweight(to_tsvector('trote_pt'::regconfig, description), 'C')) STORED,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_cents" > 0),
	CONSTRAINT "products_compare_at_above_price" CHECK ("products"."compare_at_cents" IS NULL OR "products"."compare_at_cents" > "products"."price_cents"),
	CONSTRAINT "products_weight_positive" CHECK ("products"."weight_grams" > 0),
	CONSTRAINT "products_rating_avg_range" CHECK ("products"."rating_avg" BETWEEN 0 AND 5),
	CONSTRAINT "products_rating_count_nonnegative" CHECK ("products"."rating_count" >= 0),
	CONSTRAINT "products_rating_histogram_levels" CHECK (cardinality("products"."rating_histogram") = 5)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"author_name" text NOT NULL,
	"author_place" text NOT NULL,
	"rating" smallint NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"option_value" text,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "variants_product_option_key" UNIQUE NULLS NOT DISTINCT("product_id","option_value")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"cart_id" uuid NOT NULL,
	"variant_id" integer NOT NULL,
	"quantity" smallint NOT NULL,
	CONSTRAINT "cart_items_cart_id_variant_id_pk" PRIMARY KEY("cart_id","variant_id"),
	CONSTRAINT "cart_items_quantity_range" CHECK ("cart_items"."quantity" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"converted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"percent_off" smallint,
	"amount_off_cents" integer,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "coupons_value_matches_kind" CHECK (("coupons"."kind" = 'percent_off' AND "coupons"."percent_off" BETWEEN 1 AND 100 AND "coupons"."amount_off_cents" IS NULL)
        OR ("coupons"."kind" = 'amount_off' AND "coupons"."amount_off_cents" > 0 AND "coupons"."percent_off" IS NULL)
        OR ("coupons"."kind" = 'free_freight' AND "coupons"."percent_off" IS NULL AND "coupons"."amount_off_cents" IS NULL)),
	CONSTRAINT "coupons_code_uppercase" CHECK ("coupons"."code" = upper("coupons"."code"))
);
--> statement-breakpoint
CREATE TABLE "freight_methods" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"description" text NOT NULL,
	"base_price_cents" integer NOT NULL,
	"price_per_league_cents" integer NOT NULL,
	"included_weight_grams" integer NOT NULL,
	"price_per_extra_kg_cents" integer NOT NULL,
	"min_days" smallint NOT NULL,
	"max_days" smallint NOT NULL,
	"leagues_per_extra_day" integer NOT NULL,
	"carries_bulky" boolean NOT NULL,
	"position" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "freight_methods_prices_nonnegative" CHECK ("freight_methods"."base_price_cents" >= 0 AND "freight_methods"."price_per_league_cents" >= 0 AND "freight_methods"."price_per_extra_kg_cents" >= 0),
	CONSTRAINT "freight_methods_days_range" CHECK ("freight_methods"."min_days" > 0 AND "freight_methods"."max_days" > "freight_methods"."min_days"),
	CONSTRAINT "freight_methods_leagues_per_day_positive" CHECK ("freight_methods"."leagues_per_extra_day" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"variant_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"option_name" text,
	"option_value" text,
	"unit_price_cents" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "order_items_quantity_range" CHECK ("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_unit_price_positive" CHECK ("order_items"."unit_price_cents" > 0),
	CONSTRAINT "order_items_line_total_consistent" CHECK ("order_items"."line_total_cents" = "order_items"."unit_price_cents" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"number" text DEFAULT ('TC-' || nextval('order_number_seq')) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'placed' NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"cep" char(8) NOT NULL,
	"street" text NOT NULL,
	"street_number" text NOT NULL,
	"complement" text,
	"city" text NOT NULL,
	"uf" char(2) NOT NULL,
	"freight_method_code" text NOT NULL,
	"freight_cents" integer NOT NULL,
	"freight_min_days" smallint NOT NULL,
	"freight_max_days" smallint NOT NULL,
	"leagues" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_signature" text,
	"coupon_code" text,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_cep_digits" CHECK ("orders"."cep" ~ '^[0-9]{8}$'),
	CONSTRAINT "orders_uf_letters" CHECK ("orders"."uf" ~ '^[A-Z]{2}$'),
	CONSTRAINT "orders_amounts_nonnegative" CHECK ("orders"."subtotal_cents" >= 0 AND "orders"."discount_cents" >= 0 AND "orders"."freight_cents" >= 0),
	CONSTRAINT "orders_discount_within_subtotal" CHECK ("orders"."discount_cents" <= "orders"."subtotal_cents"),
	CONSTRAINT "orders_total_consistent" CHECK ("orders"."total_cents" = "orders"."subtotal_cents" - "orders"."discount_cents" + "orders"."freight_cents"),
	CONSTRAINT "orders_fiado_signed" CHECK ("orders"."payment_method" <> 'fiado' OR "orders"."payment_signature" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_freight_method_code_freight_methods_code_fk" FOREIGN KEY ("freight_method_code") REFERENCES "public"."freight_methods"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_code_coupons_code_fk" FOREIGN KEY ("coupon_code") REFERENCES "public"."coupons"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Section page lookup by slug; also keeps slugs unique.
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
-- Child lookups, and the FK check when a parent section is deleted.
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
-- Product page lookup by slug; also keeps slugs unique.
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
-- Section listing in default "Relevância" order and "Quem levou isso também levou". Keyset on (popularity, id); partial: inactive products are never listed.
CREATE INDEX "products_category_popularity_idx" ON "products" USING btree ("category_id","popularity","id") WHERE is_active;--> statement-breakpoint
-- Section listing by price. Scanned backward for "Maior preço". Keyset on (price_cents, id).
CREATE INDEX "products_category_price_idx" ON "products" USING btree ("category_id","price_cents","id") WHERE is_active;--> statement-breakpoint
-- Section listing by "Mais ferraduras". Keyset on (rating_avg, id).
CREATE INDEX "products_category_rating_idx" ON "products" USING btree ("category_id","rating_avg","id") WHERE is_active;--> statement-breakpoint
-- "Todas as mercadorias" (no section filter) in default order.
CREATE INDEX "products_popularity_idx" ON "products" USING btree ("popularity","id") WHERE is_active;--> statement-breakpoint
-- "Todas as mercadorias" by price, both directions.
CREATE INDEX "products_price_idx" ON "products" USING btree ("price_cents","id") WHERE is_active;--> statement-breakpoint
-- "Todas as mercadorias" by rating.
CREATE INDEX "products_rating_idx" ON "products" USING btree ("rating_avg","id") WHERE is_active;--> statement-breakpoint
-- Home "Novidades da Semana": newest arrivals first.
CREATE INDEX "products_arrived_at_idx" ON "products" USING btree ("arrived_at","id") WHERE is_active;--> statement-breakpoint
-- Full-text search results (search_vector @@ tsquery, Portuguese stemming).
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
-- Typo-tolerant autocomplete: trigram similarity/ILIKE on the accent-folded name.
CREATE INDEX "products_search_name_trgm_idx" ON "products" USING gin ("search_name" gin_trgm_ops);--> statement-breakpoint
-- Product page "Cartas dos freguezes", newest first; also serves the FK cascade.
CREATE INDEX "reviews_product_created_at_idx" ON "reviews" USING btree ("product_id","created_at");--> statement-breakpoint
-- Keeps SKUs unique; lookups by SKU.
CREATE UNIQUE INDEX "variants_sku_key" ON "variants" USING btree ("sku");--> statement-breakpoint
-- FK check when a variant is deleted (otherwise a full scan of cart_items).
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
-- Loading an order's lines (confirmation page, telegram job); FK cascade.
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
-- FK check when a variant is deleted.
CREATE INDEX "order_items_variant_id_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
-- Confirmation page lookup by the unguessable public id.
CREATE UNIQUE INDEX "orders_public_id_key" ON "orders" USING btree ("public_id");--> statement-breakpoint
-- Keeps the human-facing order number ("TC-1888") unique; support lookups.
CREATE UNIQUE INDEX "orders_number_key" ON "orders" USING btree ("number");--> statement-breakpoint
-- Idempotent checkout: a retried submit finds the existing order instead of placing a second one.
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
-- One order per cart: the same cart can't be checked out twice.
CREATE UNIQUE INDEX "orders_cart_id_key" ON "orders" USING btree ("cart_id");