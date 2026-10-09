import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const failing = { get: false, set: false };

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(async (key: string) => {
      if (failing.get) throw new Error('ECONNREFUSED');
      return store.get(key) ?? null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      if (failing.set) throw new Error('ECONNREFUSED');
      store.set(key, value);
      return 'OK';
    }),
    incr: vi.fn(async (key: string) => {
      const next = Number(store.get(key) ?? 0) + 1;
      store.set(key, String(next));
      return next;
    }),
    unlink: vi.fn(async (...keys: string[]) => keys.filter((k) => store.delete(k)).length),
  },
}));

const { bumpGeneration, cached, currentGeneration, invalidate } = await import('@/lib/cache');

describe('cached (cache-aside)', () => {
  beforeEach(() => {
    store.clear();
    failing.get = false;
    failing.set = false;
  });

  it('loads once, then serves from the cache', async () => {
    const load = vi.fn(async () => ({ value: 1 }));
    expect(await cached('k', 60, load)).toEqual({ value: 1 });
    expect(await cached('k', 60, load)).toEqual({ value: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('caches null results too (e.g. unknown products)', async () => {
    const load = vi.fn(async () => null);
    await cached('missing', 60, load);
    expect(await cached('missing', 60, load)).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('collapses concurrent misses into a single load (no stampede)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const load = vi.fn(async () => {
      await gate;
      return 42;
    });
    const all = Promise.all([
      cached('hot', 60, load),
      cached('hot', 60, load),
      cached('hot', 60, load),
    ]);
    release();
    expect(await all).toEqual([42, 42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps serving from the source when Redis is down', async () => {
    failing.get = true;
    failing.set = true;
    const load = vi.fn(async () => 'fresh');
    expect(await cached('k', 60, load)).toBe('fresh');
    expect(await cached('k', 60, load)).toBe('fresh');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed loads', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce('ok');
    await expect(cached('k', 60, load)).rejects.toThrow('db down');
    expect(await cached('k', 60, load)).toBe('ok');
  });

  it('invalidates single keys and whole generations', async () => {
    await cached('k', 60, async () => 1);
    await invalidate('k');
    expect(store.has('k')).toBe(false);

    expect(await currentGeneration('catalog')).toBe(0);
    await bumpGeneration('catalog');
    expect(await currentGeneration('catalog')).toBe(1);
  });
});
