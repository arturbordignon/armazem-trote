import './src/lib/load-env';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL (or DATABASE_URL_DIRECT) must be set for drizzle-kit');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/models/*.schema.ts',
  out: './db/migrations',
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
