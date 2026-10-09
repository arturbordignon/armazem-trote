import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request state visible to every layer without threading it through arguments. */
export interface RequestContext {
  requestId: string;
  /** SQL statements issued while handling this request; surfaces N+1 patterns in logs. */
  queryCount: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(requestId: string, work: () => Promise<T>): Promise<T> {
  return storage.run({ requestId, queryCount: 0 }, work);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
