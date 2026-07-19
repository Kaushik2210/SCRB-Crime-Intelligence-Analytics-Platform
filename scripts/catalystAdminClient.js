/**
 * Standalone Catalyst client for one-off scripts (seeding, migrations) that
 * run outside a web request — `catalyst.initialize(req)` (used by server.js)
 * needs a live HTTP request, which doesn't exist here. Catalyst's Node SDK
 * has a separate documented mode for exactly this ("Integrate SDK in
 * Third-Party Apps"): `catalyst.initializeApp()` with OAuth self-client
 * credentials instead of a request object.
 *
 * Required env vars (see .env.example):
 *   CATALYST_PROJECT_ID, CATALYST_PROJECT_KEY (ZAID), CATALYST_ENVIRONMENT
 *   ("Development" | "Production"), CATALYST_REFRESH_TOKEN,
 *   CATALYST_CLIENT_ID, CATALYST_CLIENT_SECRET
 *
 * Generate the OAuth credentials via a self-client in Zoho's API Console
 * (console.catalyst.zoho.com project settings link out to it) — this is an
 * account-specific, interactive step only you can do.
 */
const catalyst = require("zcatalyst-sdk-node");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} — see scripts/catalystAdminClient.js for setup.`);
  }
  return value;
}

let cachedApp = null;

function getApp() {
  if (cachedApp) return cachedApp;

  const credential = catalyst.credential.refreshToken({
    refresh_token: requireEnv("CATALYST_REFRESH_TOKEN"),
    client_id: requireEnv("CATALYST_CLIENT_ID"),
    client_secret: requireEnv("CATALYST_CLIENT_SECRET"),
  });

  cachedApp = catalyst.initializeApp({
    project_id: requireEnv("CATALYST_PROJECT_ID"),
    project_key: requireEnv("CATALYST_PROJECT_KEY"),
    environment: process.env.CATALYST_ENVIRONMENT || "Development",
    credential,
  });
  return cachedApp;
}

/** Same defensive row-normalization as lib/zcql.js (see that file for why). */
function normalizeRow(row, tableName) {
  if (row && typeof row === "object" && tableName in row) return row[tableName];
  if (row && typeof row === "object") return row;
  throw new Error(`Unexpected ZCQL row shape for table "${tableName}": ${JSON.stringify(row)}`);
}

async function zcqlQuery(query, tableName) {
  const result = await getApp().zcql().executeZCQLQuery(query);
  return result.map((row) => normalizeRow(row, tableName));
}

function getTable(tableName) {
  return getApp().datastore().table(tableName);
}

module.exports = { getApp, zcqlQuery, getTable };
