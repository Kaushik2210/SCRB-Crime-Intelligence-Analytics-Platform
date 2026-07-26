# ZCQL & Catalyst Data Store constraints

Behaviours found by testing against the live project (`1DatathonAIDrivenCrimeMgt`).
Several of these fail **silently** — they return wrong data rather than an error —
so they're recorded here with the workaround each one uses in this codebase.

## Query language

| # | Constraint | Symptom | Workaround |
|---|---|---|---|
| 1 | `WHERE 1=1` / `1=0` are rejected | `Syntax error in given query` | `ROWID IS NOT NULL` / `ROWID IS NULL` — [`lib/scope.js`](../lib/scope.js) |
| 2 | `COUNT(*)` is rejected | `Syntax error in given query` | `COUNT(ROWID)` — [`lib/zcqlCount.js`](../lib/zcqlCount.js) |
| 3 | **Column aliases are ignored** | `SELECT ROWID AS EmployeeID` returns key `ROWID`; reading the alias yields `undefined` | Aliases re-applied after the fetch in [`lib/zcql.js`](../lib/zcql.js) (`parseAliases`) |
| 4 | **Results silently capped at 300 rows** | A query with no `LIMIT` returns 300 rows and no error; `LIMIT 500` is rejected | Auto-pagination in [`lib/zcql.js`](../lib/zcql.js) (`executePaged`) |
| 5 | `LIMIT <start>,<count>` start is **1-based** | 0-based paging re-fetches one row per page boundary (420 rows read as 421) | Pages start at 1 |
| 6 | **`LIKE` wildcard is `*`, not `%`** | `LIKE '%foo%'` is accepted but matches nothing — search returns empty | `*foo*` — [`lib/search.js`](../lib/search.js) |
| 7 | Bulk writes capped at 200 rows | `Only 200 rows can be updated at once` | Chunked in [`lib/zcql.js`](../lib/zcql.js)'s `getTable` proxy |
| 8 | No `JOIN` / `GROUP BY` relied upon | — | Lookup tables fetched separately and joined in JS via `Map` |

## Data types

- **Dates reject ISO-8601.** `DateTime` wants `YYYY-MM-DD HH:MM:SS`, `Date` wants
  `YYYY-MM-DD`. Passing `toISOString()` gives
  `Invalid input value for <col>. datetime value expected`.
  See [`lib/dbDate.js`](../lib/dbDate.js).
- Supported types: `varchar` (≤255), `text` (≤10000), `int`, `bigint`, `double`,
  `boolean`, `date`, `datetime`, plus foreign-key and encrypted-text columns.

## ROWIDs

Catalyst assigns every row a 17-digit `ROWID`, which **exceeds
`Number.MAX_SAFE_INTEGER`** (9007199254740991):

```
Number("52881000000079977") === 52881000000079976   // precision lost
```

So ROWIDs are treated as **opaque strings everywhere** — never `Number(id)`,
never `Number.isInteger(id)`, never `===` across string/number. Helpers live in
[`lib/rowId.js`](../lib/rowId.js) (`isRowId`, `sameRowId`, `assertRowId`).

This bit hard: `Number(id)` lookups against string-keyed `Map`s always missed,
which silently emptied the entire predictive-risk page.

## Schema management

There is **no CLI or SDK path to add tables/columns to an existing project** —
`catalyst deploy` covers functions/client/appsail only, and `catalyst iac:import`
creates a *new* project. The schema here was applied by driving the Console's own
REST API (`/baas/v1/project/<id>/table` and `.../table/<id>/column`) from a
logged-in browser session.
