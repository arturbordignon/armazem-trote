import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const TEST_DATABASE_SUFFIX = '_test';

/**
 * URL of the disposable integration database. Integration tests truncate tables, so refuse
 * anything whose name doesn't end in "_test" rather than risk the development database.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)');
  const name = databaseName(url);
  if (!name.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `TEST_DATABASE_URL must point at a "*${TEST_DATABASE_SUFFIX}" database, got "${name}"`,
    );
  }
  return url;
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** A short-lived connection for test setup and assertions. Call `close()` in afterAll. */
export function connectTestDatabase() {
  const client = postgres(testDatabaseUrl(), { max: 1, onnotice: () => undefined });
  return {
    db: drizzle(client, { casing: 'snake_case' }),
    close: () => client.end(),
  };
}
