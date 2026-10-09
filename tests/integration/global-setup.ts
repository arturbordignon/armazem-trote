import postgres from 'postgres';
import { runMigrations } from '../../db/migrator';
import { databaseName, testDatabaseUrl } from './test-database';

/** Creates the test database on first run and brings its schema up to date. */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  await ensureDatabaseExists(url);
  await runMigrations(url);
}

async function ensureDatabaseExists(url: string): Promise<void> {
  const name = databaseName(url);
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';

  const admin = postgres(maintenanceUrl.toString(), { max: 1, onnotice: () => undefined });
  try {
    const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (existing.length === 0) await admin`CREATE DATABASE ${admin(name)}`;
  } finally {
    await admin.end();
  }
}
