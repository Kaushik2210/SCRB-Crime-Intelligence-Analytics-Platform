import { zcqlQuery } from "@/lib/zcql";
import { getCaseScopeFilter, getDistrictScopeFilter } from "@/lib/scope";
import { getCrimeSubHeads, getUnits, getDistricts, getDesignations } from "@/lib/lookups";

/** Escapes a value for safe interpolation inside a single-quoted ZCQL string literal. */
function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Cross-entity search backing the command palette's global search. Every
 * query is run through the same jurisdiction scoping used everywhere else
 * (lib/scope.js) — an Officer typing another district's case number gets no
 * results, not a leaked one.
 *
 * ZCQL's LIKE is case-sensitive (no confirmed ILIKE/insensitive-mode
 * equivalent to Prisma's `contains ... mode: "insensitive"`), so this is a
 * slightly narrower match than before — acceptable since crime/employee
 * numbers are typically entered in a consistent case; revisit if that proves
 * not to hold in practice.
 */
export async function getGlobalSearchResults(session, query) {
  const q = query.trim();
  if (q.length < 2) return { cases: [], officers: [] };
  const likeQ = `%${escapeSql(q)}%`;

  const caseScope = getCaseScopeFilter(session);
  const districtScope = getDistrictScopeFilter(session);

  const [caseRows, officerRows, subHeads, units, districts, designations] = await Promise.all([
    zcqlQuery(
      `SELECT ROWID AS CaseMasterID, CrimeNo, CaseNo, CrimeMinorHeadID, PoliceStationID FROM CaseMaster
       WHERE ${caseScope} AND (CrimeNo LIKE '${likeQ}' OR CaseNo LIKE '${likeQ}')
       LIMIT 6`,
      "CaseMaster"
    ),
    zcqlQuery(
      `SELECT ROWID AS EmployeeID, Name, KGID, DesignationID, DistrictID FROM Employee
       WHERE ${districtScope} AND (Name LIKE '${likeQ}' OR KGID LIKE '${likeQ}')
       LIMIT 6`,
      "Employee"
    ),
    getCrimeSubHeads(),
    getUnits(),
    getDistricts(),
    getDesignations(),
  ]);

  const subHeadNameById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName]));
  const unitById = new Map(units.map((u) => [u.UnitID, u]));
  const districtNameById = new Map(districts.map((d) => [d.DistrictID, d.DistrictName]));
  const designationNameById = new Map(designations.map((d) => [d.DesignationID, d.DesignationName]));

  return {
    cases: caseRows.map((c) => {
      const unit = unitById.get(c.PoliceStationID);
      return {
        id: c.CaseMasterID,
        crimeNo: c.CrimeNo,
        caseNo: c.CaseNo,
        subHeadName: subHeadNameById.get(c.CrimeMinorHeadID) ?? "Unknown",
        unitName: unit?.UnitName ?? "Unknown",
        districtId: unit?.DistrictID ?? null,
        districtName: unit?.DistrictID != null ? districtNameById.get(unit.DistrictID) ?? null : null,
      };
    }),
    officers: officerRows.map((e) => ({
      id: e.EmployeeID,
      name: e.Name,
      kgid: e.KGID,
      designationName: designationNameById.get(e.DesignationID) ?? "Unknown",
      districtName: e.DistrictID != null ? districtNameById.get(e.DistrictID) ?? null : null,
    })),
  };
}
