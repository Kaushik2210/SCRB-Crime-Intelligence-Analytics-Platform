import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Catalyst's Node SDK binds identity/session to a single call via
 * `catalyst.initialize(req)`, where `req` must be a genuine Node/Express
 * request object (confirmed against Catalyst's Node.js SDK docs) — not the
 * Fetch API `Request` Next.js App Router route handlers receive, and not
 * available at all inside React Server Components.
 *
 * `server.js` runs Catalyst's middleware once per incoming HTTP request
 * (real Express `req`, before Next takes over) and stores the resulting
 * `catalystApp` here. Route handlers and Server Components — which all run
 * inside that same request's call stack — read it back via `getCatalystApp()`
 * instead of needing `req` threaded through every function call.
 */
export const catalystContext = new AsyncLocalStorage();

export function getCatalystApp() {
  const app = catalystContext.getStore();
  if (!app) {
    throw new Error(
      "No Catalyst app bound to the current request. This code must run inside " +
        "a request handled by server.js's Catalyst middleware (not a standalone script)."
    );
  }
  return app;
}

export function getZCQL() {
  return getCatalystApp().zcql();
}

/**
 * Per-request memoization cache, keyed off the current request's catalystApp
 * instance (a fresh object per request, from server.js's middleware) via a
 * WeakMap — so cached entries are automatically released once the request
 * ends and the catalystApp instance becomes garbage.
 *
 * Needed because independent call sites within one request/render tree
 * (e.g. app/(app)/layout.jsx's notification-bell fetch and a page's own data
 * fetch) can end up calling the same expensive function — like
 * lib/risk.js's getRiskTiles, which does several ZCQL round-trips plus
 * training a fresh ML model — with there being no direct way to share a
 * computed value across a layout and its page in the App Router.
 */
const requestCaches = new WeakMap();

function getRequestCache() {
  const app = getCatalystApp();
  let cache = requestCaches.get(app);
  if (!cache) {
    cache = new Map();
    requestCaches.set(app, cache);
  }
  return cache;
}

/** Memoizes `factory()` for the lifetime of the current request, under `key`. */
export function memoizePerRequest(key, factory) {
  const cache = getRequestCache();
  if (!cache.has(key)) {
    // Store the in-flight promise itself (not just the resolved value) so
    // concurrent callers within the same request (e.g. two Promise.all
    // branches) await the same call rather than triggering it twice.
    cache.set(key, factory());
  }
  return cache.get(key);
}
