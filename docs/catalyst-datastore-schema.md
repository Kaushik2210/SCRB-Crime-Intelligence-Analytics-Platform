# Catalyst Data Store schema (migrated from `prisma/schema.prisma`)

> **Status: provisioned.** All 28 tables and 123 columns now exist in the Catalyst
> project `1DatathonAIDrivenCrimeMgt` (ID `52881000000019001`, Development env).
> The authoritative column list is [`scripts/datastoreSchema.js`](../scripts/datastoreSchema.js),
> transcribed from [`Police_FIR_ER_Diagram.pdf`](./Police_FIR_ER_Diagram.pdf); see
> [`catalyst-apply-schema.md`](./catalyst-apply-schema.md) for how to re-apply it.
> The ER diagram is the source of truth and supersedes the Prisma-derived shape
> described below wherever the two differ.

This is the target schema for Phase 1 of the Catalyst migration (see the approved
migration plan). It mirrors every Prisma model 1:1 in shape; the differences below are
forced by how Catalyst Data Store actually works, confirmed against Catalyst's own docs
(not guessed):

## The ROWID convention (read this first)

Catalyst auto-generates a `ROWID` (BigInt) primary key on every table, plus
`CREATORID`/`CREATEDTIME`/`MODIFIEDTIME` — **you cannot define your own custom
auto-increment primary key column** the way Prisma's `@id @default(autoincrement())`
does. Rather than bolt on a second, app-managed ID scheme (extra roundtrips, race
conditions), every table below uses **`ROWID` as the real primary key**, and every
`lib/*.js` read query aliases it back to the field name existing code already expects:

```sql
SELECT ROWID AS CaseMasterID, CrimeNo, ... FROM CaseMaster WHERE ...
```

Foreign-key columns (e.g. `PoliceStationID` on `CaseMaster`) store the **referenced
row's `ROWID` value** (so they're `BigInt`, not `Int` — a type change from Prisma, but
transparent to consumers since JS doesn't distinguish integer widths). When inserting a
child row, take the `ROWID` Catalyst returns from the parent insert and use it as the
FK value. This keeps every existing function signature and return shape in `lib/*.js`
unchanged — only the column type and the alias-on-read are new.

`Act.ActCode` is Prisma's one non-integer primary key (a natural string key) — keep it
as a `VarChar` column and a manually-enforced uniqueness rule (Data Store doesn't need
a separate PK for this table to work with the ROWID convention above; `ActCode` is just
a unique business key, queried directly).

## Type mapping used throughout

| Prisma type | Catalyst column type | Notes |
|---|---|---|
| `Int` (business field, not a relation) | `Int` | e.g. `Age`, `Hierarchy`, `SortOrder` |
| `Int` (relation / `@id`) | `BigInt` | holds a `ROWID` value (see above) |
| `String` (short, indexed/unique) | `VarChar` | names, codes, statuses — ≤255 chars |
| `String` (long free text) | `Text` | `BriefFacts`, `SectionDescription` |
| `Float` | `Double` | lat/lng, centroids |
| `Boolean` | `Boolean` | |
| `DateTime` | `DateTime` | |

## Tables

**Org hierarchy**
- `State`: StateName (VarChar, unique)
- `District`: DistrictName (VarChar), StateID (BigInt→State), CentroidLat/CentroidLng (Double). Unique on (DistrictName, StateID) enforced in app code (Data Store uniqueness is per-column; composite uniqueness isn't — validate before insert).
- `UnitType`: UnitTypeName (VarChar), Hierarchy (Int), CityDistState (VarChar)
- `Unit`: UnitName (VarChar), UnitTypeID (BigInt→UnitType), DistrictID (BigInt→District, nullable), StateID (BigInt→State), ParentUnitID (BigInt→Unit, nullable, self-referential), Latitude/Longitude (Double, nullable)
- `Rank`: RankName (VarChar, unique), Hierarchy (Int)
- `Designation`: DesignationName (VarChar, unique), SortOrder (Int)
- `Employee`: KGID (VarChar, unique), Name (VarChar), DOB (DateTime), Gender (VarChar), DistrictID (BigInt→District, nullable), UnitID (BigInt→Unit, nullable), RankID (BigInt→Rank), DesignationID (BigInt→Designation), PasswordHash (VarChar), VictimClearance (Boolean, default false)
- `Court`: CourtName (VarChar), DistrictID (BigInt→District), StateID (BigInt→State)

**Legal/classification lookups**
- `CaseCategory`: CategoryName (VarChar, unique)
- `GravityOffence`: GravityName (VarChar, unique)
- `CaseStatusMaster`: StatusName (VarChar, unique)
- `CrimeHead`: CrimeHeadName (VarChar, unique)
- `CrimeSubHead`: CrimeHeadID (BigInt→CrimeHead), CrimeSubHeadName (VarChar). Unique on (CrimeHeadID, CrimeSubHeadName) enforced in app code.
- `Act`: ActCode (VarChar, business PK — see above), ActName (VarChar)
- `Section`: ActCode (VarChar→Act), SectionNumber (VarChar), SectionDescription (Text). Unique on (ActCode, SectionNumber) enforced in app code.
- `CrimeHeadActSection`: CrimeHeadID (BigInt→CrimeHead), ActCode (VarChar→Act), SectionID (BigInt→Section)

**Demographic lookups** (only referenced by `ComplainantDetails`, never `Victim`)
- `CasteMaster`, `ReligionMaster`, `OccupationMaster`: `<X>Name` (VarChar, unique)

**Core case data**
- `CaseMaster`: CrimeNo (VarChar, unique), CaseNo (VarChar), CrimeRegisteredDate (DateTime), PolicePersonID (BigInt→Employee), PoliceStationID (BigInt→Unit), CaseCategoryID (BigInt→CaseCategory), GravityOffenceID (BigInt→GravityOffence), CrimeMajorHeadID (BigInt→CrimeHead), CrimeMinorHeadID (BigInt→CrimeSubHead), CaseStatusID (BigInt→CaseStatusMaster), CourtID (BigInt→Court, nullable), IncidentFromDate (DateTime), IncidentToDate (DateTime, nullable), InfoReceivedPSDate (DateTime), Latitude/Longitude (Double), BriefFacts (Text)
- `ComplainantDetails`: CaseMasterID (BigInt→CaseMaster), Name (VarChar), Age (Int), OccupationID/ReligionID/CasteID (BigInt, nullable), Gender (VarChar)
- `Victim`: CaseMasterID (BigInt→CaseMaster), VictimName (VarChar), Age (Int), Gender (VarChar), VictimPolice (Boolean, default false)
- `Accused`: CaseMasterID (BigInt→CaseMaster), Name (VarChar), Age (Int), Gender (VarChar), PersonID (VarChar — this is the "A1"/"A2" label, unrelated to the ROWID convention)
- `ArrestSurrender`: CaseMasterID (BigInt→CaseMaster), IOID (BigInt→Employee), StateID (BigInt→State), DistrictID (BigInt→District), UnitID (BigInt→Unit), CourtID (BigInt→Court, nullable), AccusedMasterID (BigInt→Accused, nullable), VictimMasterID (BigInt→Victim, nullable), IsAccused (Boolean, default true), IsComplainantAccused (Boolean, default false), EventType (VarChar), EventDate (DateTime)
- `ActSectionAssociation`: CaseMasterID (BigInt→CaseMaster), ActCode (VarChar→Act), SectionID (BigInt→Section)
- `ChargesheetDetails`: CaseMasterID (BigInt→CaseMaster), ReportType (VarChar), ReportDate (DateTime), EmployeeID (BigInt→Employee)

**Audit/workflow**
- `AccessLog`: UserID (BigInt→Employee), Entity (VarChar), RecordID (BigInt), Action (VarChar), CreatedAt (DateTime, default now — set explicitly on insert since Data Store's own `CREATEDTIME` is reserved/system-managed)
- `AlertAction`: UserID (BigInt→Employee), AlertKey (VarChar), Status (VarChar), CreatedAt/UpdatedAt (DateTime, set explicitly on insert/update). Unique on (UserID, AlertKey) enforced in app code (check-then-insert/update, same pattern `lib/alerts.js` will need regardless of DB).

## What's intentionally not migrated as-is

- **Composite uniqueness constraints** (`@@unique([...])` in several models above) —
  Data Store enforces per-column uniqueness only; every composite-unique case is small
  and low-write-volume (lookup tables, one-per-user-per-alert), so a check-then-write in
  the corresponding `lib/*.js` function is the replacement, not a schema feature.
- **PostGIS `geog` column** (`prisma/geo-setup.js`) — dropped entirely; superseded by the
  plain `Latitude`/`Longitude` columns on `CaseMaster`/`Unit`, already used by
  the rewritten `lib/geo.js`.

## Creating this in your Catalyst project

This file is a reference for what to create — it is **not** an executable Catalyst CLI
schema file (Catalyst's exact CLI-recognized schema-definition format wasn't verifiable
without a live project to test against). Create these tables either via the Data Store
page in the Catalyst Console, or `catalyst` CLI table-creation commands, once
`catalyst login` / `catalyst init` are done. Table and column names above match exactly
what `lib/*.js`'s ZCQL queries will reference as they're converted (task tracked
separately) — keep spelling/casing identical to avoid query failures.
