import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from '@/lib/config';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';
import { updateProduct } from '@/services/catalog-admin.service';
import { productUpdateSchema } from '@/validators/admin';
import { slugSchema } from '@/validators/common';
import { revalidateCatalog } from './cache-tags';
import { handleRoute, parseInput } from './http';

type ProductRouteContext = { params: Promise<{ slug: string }> };

/**
 * PATCH /api/admin/produtos/{slug} — reprice and/or restock, with immediate cache invalidation.
 * Body: { "pricing"?: { "priceCents", "compareAtCents" }, "stock"?: [{ "sku", "onHand" }] }
 */
export const patchProduct = handleRoute<ProductRouteContext>(
  'admin.product-update',
  async (request, context) => {
    authorize(request.headers);
    const slug = parseInput(slugSchema, (await context.params).slug);
    const update = parseInput(productUpdateSchema, await request.json().catch(() => null));
    const change = await updateProduct(slug, update);
    revalidateCatalog([slug], change);
    return Response.json({ slug, change });
  },
);

function authorize(headers: Headers): void {
  const expected = config.admin.apiToken;
  // Disabled unless configured: report "not found" rather than advertise the endpoint.
  if (!expected) throw new NotFoundError();
  const provided = headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!constantTimeEquals(provided, expected)) throw new UnauthorizedError();
}

/** Compares secrets without leaking, through timing, how many leading characters matched. */
function constantTimeEquals(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
