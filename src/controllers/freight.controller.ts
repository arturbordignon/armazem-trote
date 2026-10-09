import 'server-only';
import { quoteProduct } from '@/services/freight.service';
import { paramsToRecord } from '@/validators/common';
import { productFreightQuerySchema } from '@/validators/freight';
import { cachedJson, enforceRateLimit, handleRoute, parseInput } from './http';

const HOUR = 60 * 60;
/** Quotes depend only on CEP prefix, product and quantity: identical for every visitor. */
const QUOTE_CACHE = { maxAge: HOUR, sMaxAge: 6 * HOUR, staleWhileRevalidate: HOUR };

/** GET /api/frete?cep=30140-071&produto=lampiao&qtd=1 — "Calcular o frete" on a product page. */
export const getProductFreightQuote = handleRoute('freight.product-quote', async (request) => {
  await enforceRateLimit('freight', request.headers);
  const query = parseInput(productFreightQuerySchema, paramsToRecord(request.nextUrl.searchParams));
  const quote = await quoteProduct(query.cep, query.produto, query.qtd);
  return cachedJson(request, quote, QUOTE_CACHE);
});
