# Applying the Data Store schema to a Catalyst project

The schema in [`scripts/datastoreSchema.js`](../scripts/datastoreSchema.js) is
transcribed from [`Police_FIR_ER_Diagram.pdf`](./Police_FIR_ER_Diagram.pdf).
This document records how it was applied, and how to re-apply it.

## Why not the CLI?

Catalyst offers no CLI or SDK path to add tables to an **existing** project:

- `catalyst deploy` handles functions/client/appsail only — not Data Store schema.
- `catalyst iac:import` creates a **brand-new project**; it cannot target an existing one.
- `catalyst ds:import` imports *records*, not schema, and needs a Stratus bucket.
- `zcatalyst-sdk-node` exposes no `createTable`.

So schema changes on an existing project go through the Console. Clicking through
28 tables × ~5–17 columns is slow and error-prone, so the columns are created by
calling the same internal API the Console itself uses, from the Console page.

## Procedure

1. Sign in to the [Catalyst Console](https://console.catalyst.zoho.in/) and open
   **Cloud Scale → Data Store** for the target project.
2. Create one table and one column through the UI normally. This is required to
   obtain a valid `X-ZCSRF-TOKEN` — the API rejects POSTs without it, and the
   token is only issued to the page.
3. In the browser devtools console on that page, capture the headers from the
   request the UI just made, then drive the API with them. The endpoints are:

   | Action | Method | Path (relative to `/baas/v1/project/<projectId>`) |
   |---|---|---|
   | List tables | `GET` | `/table` |
   | Create table | `POST` | `/table` — body `{ table_name, table_scope: "GLOBAL" }` |
   | List columns | `GET` | `/table/<tableId>/column` |
   | Create columns | `POST` | `/table/<tableId>/column` — body is an **array** of column objects |

   A column object looks like:

   ```json
   {
     "column_name": "CrimeNo",
     "data_type": "varchar",
     "max_length": "50",
     "default_value": null,
     "is_unique": true,
     "is_mandatory": false,
     "search_index_enabled": false,
     "audit_consent": false
   }
   ```

   Valid `data_type` values used here: `varchar` (≤255), `text` (≤10000),
   `bigint`, `int`, `double`, `boolean`, `date`, `datetime`.

4. Iterate `SCHEMA`, creating each missing table then POSTing its missing columns
   in a single array request. Compare against the `GET` responses first so the
   pass is **idempotent** — re-running it adds only what's absent and never
   duplicates or overwrites existing columns.
5. Verify by re-reading every table's columns and diffing name + `data_type`
   against `SCHEMA`.

## Result of the run on 2026-07-25

28/28 tables present, 122/123 columns matching exactly, 0 failures.

The single intentional difference: `UnitType.Hierarchy` already existed as `int`
rather than `bigint`. The ER diagram specifies `INT` for it, so `int` is correct
and was left alone.

## Note on foreign keys

Catalyst has a native `Foreign Key` column type, but the schema deliberately
stores FK values as plain `bigint` columns holding the parent row's `ROWID`,
joined in application code. This matches the existing `lib/zcql.js` query layer
(which aliases `SELECT ROWID AS CaseMasterID …`) and avoids cascade-delete
semantics the app does not want.
