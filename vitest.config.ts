import './src/lib/load-env.ts';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const INTEGRATION_TIMEOUT_MS = 30_000;
const INTEGRATION_SETUP_TIMEOUT_MS = 60_000;
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? '';
const testRedisUrl = process.env.TEST_REDIS_URL ?? '';

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // `server-only` throws outside a React Server Components bundle; tests run plain Node.
      'server-only': fromRoot('./node_modules/server-only/empty.js'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          env: { LOG_LEVEL: 'silent' },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/close-connections.ts'],
          // Point the app's own clients at the disposable test database and Redis index.
          env: {
            DATABASE_URL: testDatabaseUrl,
            DATABASE_URL_DIRECT: testDatabaseUrl,
            REDIS_URL: testRedisUrl,
            LOG_LEVEL: 'warn',
          },
          // Files share one database; run them one at a time.
          fileParallelism: false,
          testTimeout: INTEGRATION_TIMEOUT_MS,
          hookTimeout: INTEGRATION_SETUP_TIMEOUT_MS,
        },
      },
    ],
  },
});
