import { zcqlQuery } from "@/lib/zcql";
import { getCaseScopeFilter } from "@/lib/scope";
import { getCrimeSubHeads, getGravityOffences, getCaseStatuses, getUnits, getDistricts } from "@/lib/lookups";

/**
 * Flat, scoped case list for the Case Records table. Loaded in full
 * (bounded to a `take` cap) and paginated/sorted/filtered client-side in
 * DataTable — the dataset size here (hundreds, not millions, of rows) makes
 * that simpler and just as fast as a server-paginated API.
 *
 * ZCQL's JOIN support isn't confirmed against a live Catalyst project, so —
 * matching the existing manual-correlation style already used in
 * lib/risk.js — this fetches CaseMaster plus the small lookup tables it
 * needs separately and joins them in JS via Maps, rather than relying on a
 * multi-table ZCQL query.
 */
export async function getCaseRecords(session, take = 500) {
  const scopeFilter = getCaseScopeFilter(session);

  const [cases, subHeads, gravities, statuses, units, districts] = await Promise.all([
    zcqlQuery(
      `SELECT ROWID AS CaseMasterID, CrimeNo, CaseNo, CrimeRegisteredDate,
              CrimeMinorHeadID, GravityOffenceID, CaseStatusID, PoliceStationID
       FROM CaseMaster
       WHERE ${scopeFilter}
       ORDER BY CrimeRegisteredDate DESC
       LIMIT ${take}`,
      "CaseMaster"
    ),
    getCrimeSubHeads(),
    getGravityOffences(),
    getCaseStatuses(),
    getUnits(),
    getDistricts(),
  ]);

  const subHeadById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName]));
  const gravityById = new Map(gravities.map((g) => [g.GravityOffenceID, g.GravityName]));
  const statusById = new Map(statuses.map((s) => [s.CaseStatusID, s.StatusName]));
  const districtNameById = new Map(districts.map((d) => [d.DistrictID, d.DistrictName]));
  const unitById = new Map(units.map((u) => [u.UnitID, u]));

  return cases.map((c) => {
    const unit = unitById.get(c.PoliceStationID);
    return {
      id: c.CaseMasterID,
      crimeNo: c.CrimeNo,
      caseNo: c.CaseNo,
      registeredDate: c.CrimeRegisteredDate,
      subHeadName: subHeadById.get(c.CrimeMinorHeadID) ?? "Unknown",
      gravityName: gravityById.get(c.GravityOffenceID) ?? "Unknown",
      statusName: statusById.get(c.CaseStatusID) ?? "Unknown",
      unitName: unit?.UnitName ?? "Unknown",
      districtId: unit?.DistrictID ?? null,
      districtName: unit?.DistrictID != null ? districtNameById.get(unit.DistrictID) ?? null : null,
    };
  });
}
