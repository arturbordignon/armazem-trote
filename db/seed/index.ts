// CLI: pnpm db:seed [--if-empty] [--products 10000] [--seed 1887]
import '@/lib/load-env';
import { parseArgs } from 'node:util';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { generateCatalog } from './generator';
import { hasProducts, seedDatabase } from './seed';

const DEFAULT_PRODUCT_COUNT = 10_000;
const DEFAULT_SEED = 1887;

const ArgsSchema = z.object({
  'if-empty': z.boolean(),
  products: z.coerce.number().int().positive(),
  seed: z.coerce.number().int().nonnegative(),
});

const args = ArgsSchema.parse(
  parseArgs({
    options: {
      'if-empty': { type: 'boolean', default: false },
      products: { type: 'string', default: String(DEFAULT_PRODUCT_COUNT) },
      seed: { type: 'string', default: String(DEFAULT_SEED) },
    },
  }).values,
);

const client = postgres(config.db.directUrl, { max: 1, onnotice: () => undefined });
const db = drizzle(client, { casing: 'snake_case' });

try {
  if (args['if-empty'] && (await hasProducts(db))) {
    logger.info('catalog already seeded; skipping');
  } else {
    const startedAt = performance.now();
    const catalog = generateCatalog({
      productCount: args.products,
      seed: args.seed,
      referenceDate: new Date(),
    });
    const summary = await seedDatabase(db, catalog);
    logger.info({ ...summary, ms: Math.round(performance.now() - startedAt) }, 'catalog seeded');
  }
} catch (error) {
  logger.error({ err: error }, 'seed failed');
  process.exitCode = 1;
} finally {
  await client.end();
}
