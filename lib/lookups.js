import { zcqlQuery } from "@/lib/zcql";
import { memoizePerRequest } from "@/lib/catalystContext";

/**
 * Shared, per-request-memoized fetchers for small, effectively-static
 * reference tables (Unit, District, CrimeSubHead, etc.) that were previously
 * queried independently, with the same unscoped "SELECT ... FROM X" shape,
 * from half a dozen different lib/*.js files. A single dashboard/risk/alerts
 * page load could trigger the same "all units" or "all districts" query
 * 3-4 times over; these collapse that to one ZCQL round-trip per table, per
 * request, shared across every caller (see lib/catalystContext.js's
 * memoizePerRequest for how the cache is scoped and released).
 *
 * Each returns every column any current consumer needs — callers just read
 * the fields they care about — so one cached fetch serves everyone instead
 * of each call site tailoring its own SELECT list.
 */

export function getUnits() {
  return memoizePerRequest("lookup:units", () =>
    zcqlQuery(`SELECT ROWID AS UnitID, UnitName, DistrictID, Latitude, Longitude FROM Unit`, "Unit")
  );
}

export function getDistricts() {
  return memoizePerRequest("lookup:districts", () =>
    zcqlQuery(`SELECT ROWID AS DistrictID, DistrictName, CentroidLat, CentroidLng FROM District`, "District")
  );
}

export function getCrimeHeads() {
  return memoizePerRequest("lookup:crimeHeads", () =>
    zcqlQuery(`SELECT ROWID AS CrimeHeadID, CrimeHeadName FROM CrimeHead`, "CrimeHead")
  );
}

export function getCrimeSubHeads() {
  return memoizePerRequest("lookup:crimeSubHeads", () =>
    zcqlQuery(`SELECT ROWID AS CrimeSubHeadID, CrimeSubHeadName FROM CrimeSubHead`, "CrimeSubHead")
  );
}

export function getGravityOffences() {
  return memoizePerRequest("lookup:gravityOffences", () =>
    zcqlQuery(`SELECT ROWID AS GravityOffenceID, GravityName FROM GravityOffence`, "GravityOffence")
  );
}

export function getCaseCategories() {
  return memoizePerRequest("lookup:caseCategories", () =>
    zcqlQuery(`SELECT ROWID AS CaseCategoryID, CategoryName FROM CaseCategory`, "CaseCategory")
  );
}

export function getCaseStatuses() {
  return memoizePerRequest("lookup:caseStatuses", () =>
    zcqlQuery(`SELECT ROWID AS CaseStatusID, StatusName FROM CaseStatusMaster`, "CaseStatusMaster")
  );
}

export function getDesignations() {
  return memoizePerRequest("lookup:designations", () =>
    zcqlQuery(`SELECT ROWID AS DesignationID, DesignationName FROM Designation`, "Designation")
  );
}
