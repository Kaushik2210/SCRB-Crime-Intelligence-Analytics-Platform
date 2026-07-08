import { prisma } from "@/lib/db";
import { getCaseScopeFilter, getDistrictScopeFilter } from "@/lib/scope";

/**
 * Cross-entity search backing the command palette's global search. Every
 * query is run through the same jurisdiction scoping used everywhere else
 * (lib/scope.js) — an Officer typing another district's case number gets no
 * results, not a leaked one.
 */
export async function getGlobalSearchResults(session, query) {
  const q = query.trim();
  if (q.length < 2) return { cases: [], officers: [] };

  const caseScope = getCaseScopeFilter(session);
  const districtScope = getDistrictScopeFilter(session);

  const [cases, officers] = await Promise.all([
    prisma.caseMaster.findMany({
      where: {
        ...caseScope,
        OR: [
          { CrimeNo: { contains: q, mode: "insensitive" } },
          { CaseNo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        CaseMasterID: true,
        CrimeNo: true,
        CaseNo: true,
        CrimeMinorHead: { select: { CrimeSubHeadName: true } },
        PoliceStation: {
          select: { UnitName: true, DistrictID: true, District: { select: { DistrictName: true } } },
        },
      },
      take: 6,
    }),
    prisma.employee.findMany({
      where: {
        ...districtScope,
        OR: [{ Name: { contains: q, mode: "insensitive" } }, { KGID: { contains: q, mode: "insensitive" } }],
      },
      select: {
        EmployeeID: true,
        Name: true,
        KGID: true,
        Designation: { select: { DesignationName: true } },
        District: { select: { DistrictName: true } },
      },
      take: 6,
    }),
  ]);

  return {
    cases: cases.map((c) => ({
      id: c.CaseMasterID,
      crimeNo: c.CrimeNo,
      caseNo: c.CaseNo,
      subHeadName: c.CrimeMinorHead.CrimeSubHeadName,
      unitName: c.PoliceStation.UnitName,
      districtId: c.PoliceStation.DistrictID,
      districtName: c.PoliceStation.District?.DistrictName ?? null,
    })),
    officers: officers.map((e) => ({
      id: e.EmployeeID,
      name: e.Name,
      kgid: e.KGID,
      designationName: e.Designation.DesignationName,
      districtName: e.District?.DistrictName ?? null,
    })),
  };
}
