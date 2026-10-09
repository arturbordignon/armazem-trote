import 'server-only';
import type { Logger as DrizzleLogger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config';
import { logger } from './logger';
import { currentRequestContext } from './request-context';

const IDLE_TIMEOUT_SECONDS = 20;
const CONNECT_TIMEOUT_SECONDS = 5;

/** Counts every statement per request (see request logs) and optionally logs the SQL itself. */
const queryLogger: DrizzleLogger = {
  logQuery(query, params) {
    const context = currentRequestContext();
    if (context) context.queryCount += 1;
    if (config.db.logQueries) logger.debug({ sql: query, params }, 'sql');
  },
};

function createClient(): postgres.Sql {
  return postgres(config.db.url, {
    max: config.db.poolMax,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    // Transaction-mode poolers (PgBouncer) cannot keep named prepared statements per client.
    prepare: config.db.preparedStatements,
    onnotice: () => undefined,
  });
}

// Reuse one pool across hot reloads in development instead of leaking a pool per reload.
const globalForDb = globalThis as typeof globalThis & { __pgClient?: postgres.Sql };
const client = globalForDb.__pgClient ?? createClient();
if (!config.isProduction) globalForDb.__pgClient = client;

export const db = drizzle(client, { casing: 'snake_case', logger: queryLogger });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run a query: the pool or an open transaction. */
export type Executor = Database | Transaction;

export async function closeDb(): Promise<void> {
  await client.end({ timeout: CONNECT_TIMEOUT_SECONDS });
}
