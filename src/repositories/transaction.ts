import 'server-only';
import { type Transaction, db } from '@/lib/db';

export type { Executor, Transaction } from '@/lib/db';

/**
 * Runs `work` in one database transaction. Services use this to make several repository calls
 * atomic without ever touching the connection pool themselves.
 */
export function inTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(work);
}
