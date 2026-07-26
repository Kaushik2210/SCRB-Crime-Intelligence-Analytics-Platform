# SCRB Crime Intelligence & Analytics Platform

An AI-driven crime analytics and visualization platform for the Karnataka State Police
State Crime Records Bureau — a Next.js App Router application running on **Zoho Catalyst**,
with its schema modeled on the KSP FIR ER diagram
([docs/Police_FIR_ER_Diagram.pdf](docs/Police_FIR_ER_Diagram.pdf)).

## Stack

Next.js 14 (App Router, JavaScript/JSX — no TypeScript) · Tailwind CSS v4 + shadcn/ui ·
**Zoho Catalyst AppSail + Data Store (ZCQL)** · NextAuth (Credentials + JWT) ·
**Leaflet + OpenStreetMap** · Recharts · `react-force-graph-2d` ·
`ml-random-forest` (predictive risk) · Vitest.

The `@/*` import alias is resolved via [jsconfig.json](jsconfig.json) (the JS equivalent of a
TypeScript project's `tsconfig.json` paths mapping).

## Prerequisites

- Node.js 20+
- [Catalyst CLI](https://docs.catalyst.zoho.com/en/cli/v1/introduction/) — `npm i -g zcatalyst-cli`
- A Catalyst project with the Data Store schema applied (see [Database](#database) below)

No Docker, no Postgres, and no Mapbox token are needed — the map uses OpenStreetMap tiles,
which require no API key.

### One-time Catalyst CLI setup

The CLI insists on a Node 18 binary even when a newer Node is installed. Point it at your
existing Node and log in:

```bash
catalyst config:set node18.bin="C:\Program Files\nodejs\node.exe"   # adjust path for your OS
catalyst login
```

## Running

```bash
npm install
npm run dev
```

Then open **http://localhost:3001**.

> **Port note:** the app is served on **3001**, not 3000. `catalyst serve` claims 3000 for its
> own CLI server and offsets AppSail to the next port. `NEXTAUTH_URL` in `.env` and
> `app-config.json` must match whatever port the app actually lands on, or sign-in redirects
> break.

`npm run dev` runs `catalyst serve`, **not** `next dev`. This matters: the app needs the custom
[server.js](server.js) wrapper to bind the Catalyst SDK to each incoming request (see
[Architecture notes](#architecture-notes)). Running `next dev` directly bypasses `server.js`,
so every database call fails — and because the failure surfaces through NextAuth, the only
symptom you see is a misleading *"Invalid KGID or password."* on the login screen.
`npm run dev:next` is still available for pure-UI work, but only with `DEMO_MODE=true`.

### Demo credentials

| Role | KGID | Scope |
|---|---|---|
| SCRB Analyst | `KGID100001` | Statewide, victim clearance |
| District Superintendent | `KGID100006` | District-scoped, victim clearance |
| Station Officer | `KGID100007` | District-scoped, **no** clearance — victim names render masked |

All seeded employees share the password `Demo@1234`.

### Demo mode (no database)

Setting `DEMO_MODE=true` swaps every Data Store read for an in-memory dataset
([lib/demoData.js](lib/demoData.js)), letting the whole app run — login, dashboard, maps,
charts, network graph — with no Catalyst backend at all. Useful for UI work; the seeded
Catalyst Data Store is the real path.

## Database

The Data Store schema mirrors the ER diagram: 28 tables, plus `AlertAction` and `AccessLog`
for app features the diagram doesn't model. Full column reference:
[docs/catalyst-datastore-schema.md](docs/catalyst-datastore-schema.md).

Catalyst has **no CLI or SDK path to add tables to an existing project** — `catalyst deploy`
covers functions/client/appsail only, and `catalyst iac:import` creates a *new* project. The
schema here was applied by driving the Console's own REST API from a logged-in browser
session; see [docs/catalyst-apply-schema.md](docs/catalyst-apply-schema.md).

### Seeding

Seeding runs **through the app** (`POST /api/admin/seed`, guarded by `SEED_SECRET`) rather
than from the CLI, because the standalone CLI path
([scripts/catalystAdminClient.js](scripts/catalystAdminClient.js)) needs OAuth self-client
credentials that aren't configured here. With the app running:

```bash
curl -X POST http://localhost:3001/api/admin/seed -H "x-seed-secret: $SEED_SECRET"
```

This writes ~420 cases across 15 districts, 138 employees, and all linked victims, accused,
arrests, and chargesheets. **It is not idempotent** — running it twice duplicates everything.

## Screens

Dashboard (trend/category/flow/calendar charts) · District drill-down (time-ranged hotspot
clustering) · Network & link analysis (repeat-offender + co-accused association graph) ·
Predictive risk (severity tiles + ML forecast + crime-category treemap) · Alerts & trends
(dismiss/investigate workflow) · Case Records (sortable/filterable/paginated table) · a
Ctrl/Cmd+K command palette searching pages, districts, cases, and officers · an
Intelligence Report export.

## Architecture notes

- **Single Next.js app** serves both UI and API via Route Handlers — there's no separate
  backend service.
- **Per-request Catalyst binding** ([server.js](server.js),
  [lib/catalystContext.js](lib/catalystContext.js)): Catalyst's SDK binds identity to a call
  via `catalyst.initialize(req)`, which needs a real Node/Express request — not the Fetch
  `Request` that Route Handlers get, and not available at all inside Server Components. So
  `server.js` runs Catalyst's middleware once per request and stashes the app in an
  `AsyncLocalStorage`, which everything downstream reads via `getCatalystApp()`.
  That store is pinned to `globalThis` under a `Symbol.for` key, because this module is
  loaded *twice* in one process — once by `server.js`'s plain `require`, once from inside the
  webpack bundle — and two separate instances mean the writer and readers never see each
  other.
- **ZCQL quirks are handled in the query layer**, not at call sites — see
  [docs/zcql-constraints.md](docs/zcql-constraints.md). Several ZCQL behaviours fail
  *silently* (aliases ignored, results capped at 300 rows, `LIKE` using `*` rather than `%`),
  returning wrong data rather than erroring, so [lib/zcql.js](lib/zcql.js) normalizes them
  centrally.
- **ROWIDs are strings, always** ([lib/rowId.js](lib/rowId.js)): Catalyst row ids are 17-digit
  values that exceed `Number.MAX_SAFE_INTEGER`, so `Number(id)` silently loses precision and
  breaks string-keyed `Map` lookups. Never `Number()` an id.
- **Server-side jurisdiction scoping** ([lib/scope.js](lib/scope.js)): every case-data query
  is filtered through `getCaseScopeFilter(session)`, which returns an unrestricted match for
  state-level analysts and a district-pinned subquery for everyone else. Enforced in the data
  layer, not hidden client-side.
- **Victim-data masking** ([lib/masking.js](lib/masking.js)): victim names are replaced with
  `Victim #{id}` unless the session carries `victimClearance`. Every unmasked view is logged
  to `AccessLog` via `logUnmaskedVictimAccess`.
- **Aggregate-only demographics** ([lib/demographics.js](lib/demographics.js)): caste/religion/
  occupation are only ever exposed as grouped counts/percentages, never as individual-level
  filters.
- **Hotspot detection without PostGIS** ([lib/geo.js](lib/geo.js)): Data Store has no spatial
  extension, so an in-process haversine DBSCAN replaces the old `ST_ClusterDBSCAN` raw SQL,
  keeping the same eps/minPts semantics.
- **Predictive risk uses a local model** ([lib/riskModel.js](lib/riskModel.js)): Zia AutoML is
  unavailable in the India data center, so a `ml-random-forest` regressor trained on rolling
  90-day windows per (station, category) produces the next-quarter forecast. Results are
  TTL-cached — retraining on every request isn't free.
- **Alert workflow** ([lib/alerts.js](lib/alerts.js)): anomalies and chargesheet events are
  computed on read (there's no alerts table), so per-user dismiss/investigate state is
  persisted in `AlertAction`, keyed by a stable alert-id string rather than a foreign key.
- **Chart/table components carrying `render` functions** (`components/cases/CasesTable.jsx`,
  `components/shared/KpiCard.jsx` + `CountUpValue.jsx`) keep their column/render definitions
  inside a client component — functions can't be passed as props from a Server Component to a
  Client Component, so the server page only ever passes serializable data down.

## Testing

```bash
npm test        # scoping + victim-masking unit tests (lib/scope.js, lib/masking.js)
npm run lint
npm run build
```

## Known limitations (datathon scope)

- Repeat-offender matching in the network view identifies the same person by
  name + gender across cases (there's no global "person" master in this schema — `Accused`
  rows are case-scoped). This is a documented simplification, not real entity resolution.
- District boundaries are approximated by a centroid + station scatter, not real GeoJSON
  polygons — adequate for point-based hotspot/heatmap demos, not for precise boundary
  queries.
- Auth stays on NextAuth Credentials rather than Catalyst Authentication, which is built
  around Catalyst owning the login UI and a self-signup user model capped at 25 users in
  development — a mismatch for an IT-provisioned KGID employee directory.
- `NEXTAUTH_SECRET` and `SEED_SECRET` currently sit in plaintext in `app-config.json`, which
  is tracked by git. Move these to Catalyst environment configuration before any real
  deployment.
- `POST /api/admin/seed` is live and secret-gated. Remove the route once the data is loaded.
