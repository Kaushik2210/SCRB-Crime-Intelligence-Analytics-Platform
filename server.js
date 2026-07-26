const { createServer } = require("node:http");
const { AsyncLocalStorage } = require("node:async_hooks");
const express = require("express");
const next = require("next");
const catalyst = require("zcatalyst-sdk-node");

// Deliberately NOT `require("./lib/catalystContext")`: that file is ESM, and
// `require()` of an ESM module only works from Node 22 — AppSail's node18
// stack would throw ERR_REQUIRE_ESM. Both sides instead resolve the same
// AsyncLocalStorage through a `Symbol.for` key on globalThis, which is what
// lib/catalystContext.js does too (see the comment there for why a plain
// module-level instance isn't enough).
const CONTEXT_KEY = Symbol.for("ksp.catalystContext");
const catalystContext =
  globalThis[CONTEXT_KEY] ?? (globalThis[CONTEXT_KEY] = new AsyncLocalStorage());

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// AppSail injects the port to bind on via this env var; 3000 is only a local
// fallback for `npm run dev`.
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // Bind Catalyst's per-request identity/session before Next.js handles the
  // request, so every Route Handler and Server Component invoked further
  // down this same request's call stack can call getCatalystApp()/getZCQL()
  // (see lib/catalystContext.js) without req being threaded through manually.
  server.use((req, res, next) => {
    try {
      const catalystApp = catalyst.initialize(req);
      catalystContext.run(catalystApp, () => next());
    } catch (err) {
      // Only reachable outside real Catalyst infra (e.g. this env var isn't
      // set locally) — fail the one request, not the whole server process.
      console.error("Catalyst SDK initialization failed for this request:", err);
      res.statusCode = 500;
      res.end("Catalyst SDK failed to initialize for this request. Are you running under Catalyst AppSail/serve?");
    }
  });

  server.all("*", (req, res) => handle(req, res));

  createServer(server).listen(port, () => {
    console.log(`> Ready on port ${port} (${dev ? "development" : "production"})`);
  });
});
