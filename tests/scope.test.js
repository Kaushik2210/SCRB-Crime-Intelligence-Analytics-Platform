import { describe, it, expect } from "vitest";
import { getCaseScopeFilter, getDistrictScopeFilter, resolveAllowedDistrictId } from "@/lib/scope";

function makeSession(overrides) {
  return {
    employeeId: 1,
    kgid: "KGID100001",
    name: "Test Employee",
    rankName: "SP",
    rankHierarchy: 5,
    designationName: "District Superintendent",
    districtId: 3,
    districtName: "Mysuru",
    unitId: 10,
    unitName: "Mysuru District SP Office",
    isStateLevel: false,
    victimClearance: false,
    ...overrides,
  };
}

describe("getCaseScopeFilter", () => {
  // ZCQL rejects `1=1` / `1=0` as syntax errors, so the tautologies are
  // expressed against ROWID instead (see lib/scope.js).
  it("returns an unrestricted filter for state-level analysts", () => {
    const analyst = makeSession({ isStateLevel: true, districtId: null, districtName: null });
    expect(getCaseScopeFilter(analyst)).toBe("ROWID IS NOT NULL");
  });

  it("pins district officers to their own district only", () => {
    const officer = makeSession({ isStateLevel: false, districtId: 3 });
    const filter = getCaseScopeFilter(officer);
    expect(filter).toBe("PoliceStationID IN (SELECT ROWID FROM Unit WHERE DistrictID = 3)");
    // Never accidentally returns an unrestricted filter for a non-state-level session.
    expect(filter).not.toBe("ROWID IS NOT NULL");
  });

  it("fails closed (zero results) when a non-state-level session has no district", () => {
    const orphan = makeSession({ isStateLevel: false, districtId: null });
    const filter = getCaseScopeFilter(orphan);
    expect(filter).toBe("ROWID IS NULL");
  });

  it("never lets one officer's filter match another district's cases", () => {
    const officerA = makeSession({ districtId: 3 });
    const officerB = makeSession({ districtId: 7 });
    const filterA = getCaseScopeFilter(officerA);
    const filterB = getCaseScopeFilter(officerB);
    expect(filterA).not.toBe(filterB);
  });

  it("rejects a non-integer districtId rather than interpolating it unchecked", () => {
    const tampered = makeSession({ districtId: "3); DROP TABLE CaseMaster; --" });
    expect(() => getCaseScopeFilter(tampered)).toThrow();
  });
});

describe("getDistrictScopeFilter", () => {
  it("scopes to DistrictID directly for officers, unrestricted for analysts", () => {
    expect(getDistrictScopeFilter(makeSession({ districtId: 5 }))).toBe("DistrictID = 5");
    expect(getDistrictScopeFilter(makeSession({ isStateLevel: true }))).toBe("ROWID IS NOT NULL");
  });
});

describe("resolveAllowedDistrictId", () => {
  it("lets analysts view any district", () => {
    const analyst = makeSession({ isStateLevel: true });
    expect(resolveAllowedDistrictId(analyst, 99)).toBe(99);
  });

  it("lets an officer view only their own district", () => {
    const officer = makeSession({ districtId: 3 });
    expect(resolveAllowedDistrictId(officer, 3)).toBe(3);
    expect(resolveAllowedDistrictId(officer, 4)).toBeNull();
  });
});
