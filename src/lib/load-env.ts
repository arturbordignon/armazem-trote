// Side-effect module for code that runs outside Next.js (migrations, seed, worker, tests):
// loads .env files with Next.js precedence. Import it before anything that reads config.
import { existsSync } from 'node:fs';

const mode = process.env.NODE_ENV ?? 'development';

// Most specific first. process.loadEnvFile never overwrites a variable that is already set,
// so the shell wins over every file and earlier files win over later ones.
const files = [
  `.env.${mode}.local`,
  ...(mode === 'test' ? [] : ['.env.local']),
  `.env.${mode}`,
  '.env',
];

for (const file of files) {
  if (existsSync(file)) process.loadEnvFile(file);
}
