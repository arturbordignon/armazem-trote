// Load test: `pnpm test:load` (needs a production build running on BASE_URL, default :3000).
// Three workloads, each with its own latency budget:
//   cached reads   — prerendered pages and CDN-cacheable APIs, p95 < 150 ms
//   uncached reads — filter/search/CEP combinations nobody asked for yet, p95 < 300 ms
//   cart writes    — "add to cart" server action on a fresh guest cart, p95 < 300 ms
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const ADD_TO_CART_ACTION = __ENV.ADD_TO_CART_ACTION; // id from .next/server/server-reference-manifest.json
const VARIANT_COUNT = Number(__ENV.VARIANT_COUNT || 18000);
const DURATION = __ENV.DURATION || '60s';

export const options = {
  scenarios: {
    cached_reads: {
      executor: 'constant-arrival-rate',
      exec: 'cachedReads',
      rate: Number(__ENV.CACHED_RPS || 100),
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 50,
      maxVUs: 300,
    },
    uncached_reads: {
      executor: 'constant-arrival-rate',
      exec: 'uncachedReads',
      rate: Number(__ENV.UNCACHED_RPS || 20),
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 20,
      maxVUs: 150,
    },
    cart_writes: {
      executor: 'constant-arrival-rate',
      exec: 'cartWrites',
      rate: Number(__ENV.WRITE_RPS || 10),
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 10,
      maxVUs: 100,
    },
  },
  thresholds: {
    'http_req_duration{kind:cached}': ['p(95)<150'],
    'http_req_duration{kind:uncached}': ['p(95)<300'],
    'http_req_duration{kind:write}': ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const SECTIONS = [
  'mantimentos',
  'iluminacao',
  'vestuario',
  'montaria',
  'ferramentas',
  'utensilios',
  'curiosidades',
];
const PRODUCTS = [
  'lampiao',
  'chapeu',
  'ferradura',
  'cafe',
  'radio',
  'sela',
  'cuia',
  'banha',
  'costura',
  'barril',
];
const TERMS = [
  'lampiao',
  'cafe',
  'chapeu',
  'sela',
  'corda',
  'vela',
  'botina',
  'queijo',
  'machado',
  'panela',
  'barril',
  'luneta',
];
const SORTS = ['relevancia', 'menor-preco', 'maior-preco', 'ferraduras'];
const FITS = ['tanto-faz', 'lombo', 'charrete'];
const POPULAR_CEPS = ['01310-100', '30140-071', '90010-000', '20040-020', '80010-000'];

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const int = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Many distinct clients (as behind a CDN), so per-client rate limits don't throttle the test,
 * asking for compressed responses like every browser does.
 */
const client = () => ({
  'X-Forwarded-For': `10.${int(0, 255)}.${int(0, 255)}.${int(1, 254)}`,
  'Accept-Encoding': 'gzip, br',
});

function get(path, kind) {
  const response = http.get(`${BASE}${path}`, {
    headers: client(),
    tags: { kind, name: path.split('?')[0] },
  });
  check(response, { [`${kind} 200`]: (r) => r.status === 200 });
}

export function cachedReads() {
  const roll = Math.random();
  if (roll < 0.2) get('/', 'cached');
  else if (roll < 0.4) get(`/secao/${pick(SECTIONS)}`, 'cached');
  else if (roll < 0.6) get(`/mercadoria/${pick(PRODUCTS)}`, 'cached');
  else if (roll < 0.8) get(`/api/busca/sugestoes?q=${pick(TERMS).slice(0, int(2, 5))}`, 'cached');
  else get(`/api/frete?cep=${pick(POPULAR_CEPS)}&produto=${pick(PRODUCTS)}&qtd=1`, 'cached');
}

export function uncachedReads() {
  const roll = Math.random();
  if (roll < 0.4) {
    const query = `preco=${int(2, 250) * 10}&ordem=${pick(SORTS)}&cabe=${pick(FITS)}`;
    get(`/secao/${pick(SECTIONS)}?${query}`, 'uncached');
  } else if (roll < 0.7) {
    get(`/busca?q=${pick(TERMS)}%20${pick(TERMS)}`, 'uncached');
  } else {
    const cep = `${int(10000, 99999)}-${int(100, 999)}`;
    get(`/api/frete?cep=${cep}&produto=${pick(PRODUCTS)}&qtd=${int(1, 5)}`, 'uncached');
  }
}

export function cartWrites() {
  const response = http.post(
    `${BASE}/`,
    JSON.stringify([{ variantId: int(1, VARIANT_COUNT), quantity: 1 }]),
    {
      headers: {
        ...client(),
        'Next-Action': ADD_TO_CART_ACTION,
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'text/x-component',
      },
      tags: { kind: 'write', name: 'addToCartAction' },
    },
  );
  check(response, { 'write 200': (r) => r.status === 200 });
}
