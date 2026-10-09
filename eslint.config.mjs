import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------------------------------------
// Layering: views → controllers → services → repositories. Each layer lists what it may NOT
// import. Type-only imports are always allowed (they vanish at runtime).
// ---------------------------------------------------------------------------------------------
const SERVER_INFRA = ['@/lib/db', '@/lib/redis'];
const MODEL_VALUES = ['@/models/*', '!@/models/constants'];

/** @param {string[]} forbidden @param {string} message */
function layer(files, forbidden, message) {
  return {
    files,
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: forbidden, message, allowTypeImports: true },
            { group: ['../*'], message: 'Import across folders through the "@/" alias.' },
          ],
        },
      ],
    },
  };
}

const layering = [
  layer(
    ['src/app/**', 'src/components/**'],
    ['@/services/*', '@/repositories/*', '@/jobs/*', ...SERVER_INFRA, ...MODEL_VALUES],
    'Views talk to controllers only; data comes from page-level services through them.',
  ),
  layer(
    ['src/controllers/**'],
    ['@/repositories/*', '@/app/*', '@/components/*', '@/jobs/*', ...SERVER_INFRA, ...MODEL_VALUES],
    'Controllers parse input and call a service; they never reach the database.',
  ),
  layer(
    ['src/services/**'],
    ['@/controllers/*', '@/app/*', '@/components/*', '@/lib/db'],
    'Services hold business logic; database access goes through repositories.',
  ),
  layer(
    ['src/repositories/**'],
    [
      '@/services/*',
      '@/controllers/*',
      '@/app/*',
      '@/components/*',
      '@/jobs/*',
      '@/lib/cache',
      '@/lib/rate-limit',
    ],
    'Repositories only store and load data (Postgres, Redis carts); caching belongs to services.',
  ),
  layer(
    ['src/validators/**'],
    [
      '@/services/*',
      '@/repositories/*',
      '@/controllers/*',
      '@/jobs/*',
      '@/app/*',
      '@/components/*',
      '@/lib/config',
      ...SERVER_INFRA,
      ...MODEL_VALUES,
    ],
    'Validators are shared with the browser: pure zod schemas only.',
  ),
  layer(
    ['src/models/**'],
    ['@/*', '!@/models/*'],
    'Models are the innermost layer: schema and domain types only.',
  ),
  layer(
    ['src/lib/**'],
    [
      '@/services/*',
      '@/repositories/*',
      '@/controllers/*',
      '@/app/*',
      '@/components/*',
      '@/jobs/*',
    ],
    'lib/ is infrastructure; it must not depend on application layers.',
  ),
  layer(
    ['src/jobs/**'],
    ['@/app/*', '@/components/*', '@/controllers/*', '@/repositories/*', '@/lib/db'],
    'Jobs run business logic through services.',
  ),
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // `const { dropped, ...rest } = obj` is the idiomatic way to omit a key.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
    },
  },
  ...layering,
  // Plain JavaScript outside the TypeScript project: config files and the k6 script (which
  // runs in k6's own runtime, with its `__ENV` global).
  { files: ['**/*.mjs', 'tests/load/**/*.js'], ...tseslint.configs.disableTypeChecked },
  { files: ['tests/load/**/*.js'], languageOptions: { globals: { __ENV: 'readonly' } } },
  prettier,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'db/migrations/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
