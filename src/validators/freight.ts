import * as z from 'zod/mini';
import { cepSchema, quantitySchema, slugSchema } from './common';

/** GET /api/frete?cep=30140-071&produto=lampiao&qtd=2 */
export const productFreightQuerySchema = z.object({
  cep: cepSchema,
  produto: slugSchema,
  qtd: z._default(quantitySchema, 1),
});

export type ProductFreightQuery = z.infer<typeof productFreightQuerySchema>;
