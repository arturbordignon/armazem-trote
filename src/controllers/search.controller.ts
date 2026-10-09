import 'server-only';
import { suggest } from '@/services/search.service';
import { suggestQuerySchema } from '@/validators/catalog';
import { cachedJson, enforceRateLimit, handleRoute, parseInput } from './http';

const MINUTE = 60;
/** Suggestions are the same for everyone: let browsers and the CDN absorb repeat keystrokes. */
const SUGGESTIONS_CACHE = { maxAge: MINUTE, sMaxAge: 10 * MINUTE, staleWhileRevalidate: MINUTE };

/** GET /api/busca/sugestoes?q=lamp — autocomplete for the search box. */
export const getSuggestions = handleRoute('search.suggestions', async (request) => {
  await enforceRateLimit('search', request.headers);
  const { q } = parseInput(suggestQuerySchema, { q: request.nextUrl.searchParams.get('q') ?? '' });
  return cachedJson(request, { suggestions: await suggest(q) }, SUGGESTIONS_CACHE);
});
