/**
 * Plain in-process TTL cache — safe here because AppSail runs this app as a
 * persistent, long-running Node process (confirmed via Catalyst's own
 * Next.js-on-AppSail reference: `npm run start` → `next start`/server.js,
 * not a per-invocation serverless function), so module-level state survives
 * across requests within one running instance. Not shared across multiple
 * instances/restarts — fine for this app's scale and staleness tolerance.
 */
const store = new Map();

/** Returns the cached value for `key` if still fresh, otherwise computes and caches it. */
export function getOrSetTTL(key, ttlMs, factory) {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.promise;
  }
  const promise = Promise.resolve()
    .then(factory)
    .catch((err) => {
      store.delete(key); // don't cache failures
      throw err;
    });
  store.set(key, { promise, expiresAt: Date.now() + ttlMs });
  return promise;
}
