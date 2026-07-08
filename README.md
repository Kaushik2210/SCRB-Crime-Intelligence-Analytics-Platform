# SCRB Crime Intelligence & Analytics Platform

An AI-driven crime analytics and visualization platform for the Karnataka State Police
State Crime Records Bureau — built as a Next.js App Router application over a
PostgreSQL + PostGIS database, modeled on the KSP FIR schema.

## Stack

Next.js 14 (App Router, JavaScript/JSX — no TypeScript) · Tailwind CSS v4 + shadcn/ui · Prisma 5 +
PostgreSQL/PostGIS · NextAuth (Credentials + JWT) · Mapbox GL JS (`react-map-gl`) · Recharts ·
`react-force-graph-2d` · Vitest.

The `@/*` import alias is resolved via [jsconfig.json](jsconfig.json) (the JS equivalent of a
TypeScript project's `tsconfig.json` paths mapping).

## Prerequisites

- Node.js 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local Postgres+PostGIS
  container) — **not currently installed on this machine**; install it before running the steps
  below.
- A free [Mapbox access token](https://account.mapbox.com/access-tokens/) for the map screens
  (dashboard, district drill-down). The app runs without one — map components render a fallback
  message instead of crashing — but you won't see the geospatial views without it.

## Setup

```bash
npm install

# 1. Start Postgres+PostGIS
docker compose up -d

# 2. Copy environment variables and fill in NEXT_PUBLIC_MAPBOX_TOKEN
cp .env.example .env

# 3. Create the schema
npm run db:migrate

# 4. Add the PostGIS geography column + GIST index + sync trigger on case_master
#    (Prisma's schema can't express a generated geography column directly, so
#    this is applied as a follow-up raw-SQL step — see prisma/sql/geo-setup.sql)
npm run db:geo-setup

# 5. Seed synthetic Karnataka crime data (~420 cases across 15 districts, ~55 employees)
npm run db:seed

# 6. Run the app
npm run dev
```

Open http://localhost:3000. The seed script prints demo KGID/password credentials for
three roles when it finishes:

- **SCRB Analyst** (state-level, statewide data + victim clearance)
- **District Superintendent** (district-scoped, has victim clearance)
- **Station Officer** (district-scoped, no victim clearance — victim names render masked)

All seeded employees share the password `Demo@1234`.

## Architecture notes

- **Single Next.js app** serves both UI and API via Route Handlers — there's no separate
  backend service.
- **Server-side jurisdiction scoping** ([lib/scope.js](lib/scope.js)): every case-data query
  is filtered through `getCaseScopeFilter(session)`, which returns `{}` for state-level
  analysts and a district-pinned Prisma `where` fragment for everyone else. This is enforced
  in the data layer, not hidden client-side.
- **Victim-data masking** ([lib/masking.js](lib/masking.js)): victim names are replaced with
  `Victim #{id}` unless the session carries `victimClearance`. Every unmasked view is logged
  to the `AccessLog` table via `logUnmaskedVictimAccess`.
- **Aggregate-only demographics** ([lib/demographics.js](lib/demographics.js)): caste/religion/
  occupation are only ever exposed as grouped counts/percentages, never as individual-level
  filters.
- **Real PostGIS usage** ([lib/geo.js](lib/geo.js)): hotspot detection runs `ST_ClusterDBSCAN`
  over a `geography(Point,4326)` column (populated by `npm run db:geo-setup`) when PostGIS is
  available, falling back to a JS-based distance clustering otherwise — not raw float
  comparisons either way.
- **`prisma/seed.js` and `prisma/geo-setup.js`** are plain CommonJS (`require`/`module.exports`)
  so they run directly via `node`, independent of Next's own ESM/JSX bundling of the app code.

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
