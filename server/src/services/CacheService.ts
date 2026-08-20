// In-memory cache-aside layer (not Redis — this app runs as a single Node
// process for a small shop, so a shared external cache buys nothing but a
// new account/dependency to manage; see the conversation this was added in).
// Same shape as a Redis-backed version would have, so swapping one in later
// (e.g. if this ever runs as multiple instances) only means rewriting this
// one file, not any call site.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[cache] HIT  ${key}`);
    return cached.value as T;
  }

  console.log(`[cache] MISS ${key} — querying Neon`);
  const value = await fetchFn();
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}

/** Drops one exact cache key — call after a mutation that affects it. */
export function invalidateCacheKey(key: string): void {
  if (store.delete(key)) console.log(`[cache] INVALIDATED ${key}`);
}

/** Drops every cache key containing `pattern` — for invalidating a family of keys at once. */
export function invalidateCachePattern(pattern: string): void {
  for (const key of store.keys()) {
    if (key.includes(pattern) && store.delete(key)) {
      console.log(`[cache] INVALIDATED ${key}`);
    }
  }
}
