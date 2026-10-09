import * as z from 'zod/mini';

const cents = z.number().check(z.int(), z.positive());

/** PATCH /api/admin/produtos/{slug}: reprice and/or restock. */
export const productUpdateSchema = z
  .object({
    pricing: z.optional(
      z.object({
        priceCents: cents,
        compareAtCents: z.nullable(cents),
      }),
    ),
    stock: z.optional(
      z
        .array(
          z.object({
            sku: z.string().check(z.minLength(1), z.maxLength(64)),
            onHand: z.number().check(z.int(), z.nonnegative()),
          }),
        )
        .check(z.minLength(1), z.maxLength(50)),
    ),
  })
  .check(
    z.refine(
      (body) => body.pricing !== undefined || body.stock !== undefined,
      'Nada para atualizar.',
    ),
  );

export type ProductUpdate = z.infer<typeof productUpdateSchema>;
