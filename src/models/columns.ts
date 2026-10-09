import { customType, timestamp } from 'drizzle-orm/pg-core';

/** Postgres full-text search document. Read-only from the app: always a generated column. */
export const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const timestamptz = () => timestamp({ withTimezone: true, mode: 'date' });

export const createdAt = () => timestamptz().notNull().defaultNow();
export const updatedAt = () =>
  timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
