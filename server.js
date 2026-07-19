const { createServer } = require("node:http");
const express = require("express");
const next = require("next");
const catalyst = require("zcatalyst-sdk-node");
const { catalystContext } = require("./lib/catalystContext");

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
    const catalystApp = catalyst.initialize(req);
    catalystContext.run(catalystApp, () => next());
  });

  server.all("*", (req, res) => handle(req, res));

  createServer(server).listen(port, () => {
    console.log(`> Ready on port ${port} (${dev ? "development" : "production"})`);
  });
});
