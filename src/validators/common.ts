// Small schema building blocks. zod/mini keeps the browser bundle small: these schemas are
// shared by client forms and server controllers.
import * as z from 'zod/mini';
import { CEP_DIGITS, MAX_LINE_QUANTITY } from '@/models/constants';

export const INVALID_CEP_MESSAGE = 'O CEP precisa de 8 números, como 37540-000.';

/** "37540-000", "37540000" or "37 540 000" → "37540000". */
export const cepSchema = z
  .pipe(
    z.string(),
    z.transform((value) => value.replace(/\D/g, '')),
  )
  .check(z.refine((digits) => digits.length === CEP_DIGITS, INVALID_CEP_MESSAGE));

export const slugSchema = z.string().check(z.maxLength(160), z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));

export const quantitySchema = z.coerce
  .number()
  .check(z.int(), z.minimum(1), z.maximum(MAX_LINE_QUANTITY));

/** Opaque pagination cursor (base64url). Shape is checked where it's decoded. */
export const cursorSchema = z.string().check(z.maxLength(200), z.regex(/^[\w-]+$/));

/** Page number for display; anything odd falls back to page 1. */
export const pageNumberSchema = z.catch(z.coerce.number().check(z.int(), z.minimum(1)), 1);

/** A query-string value that may appear once, many times or not at all. */
export const repeatedParam = z.pipe(
  z.optional(z.union([z.string(), z.array(z.string())])),
  z.transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value])),
);

/** URLSearchParams (or Next's searchParams object) → plain record, keeping repeated keys. */
export function paramsToRecord(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  if (!(params instanceof URLSearchParams)) {
    return Object.fromEntries(
      Object.entries(params).filter(
        (entry): entry is [string, string | string[]] => entry[1] !== undefined,
      ),
    );
  }
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length === 1 ? (values[0] as string) : values;
  }
  return record;
}

export const uuidSchema = z.uuid();
