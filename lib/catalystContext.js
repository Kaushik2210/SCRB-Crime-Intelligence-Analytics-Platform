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
