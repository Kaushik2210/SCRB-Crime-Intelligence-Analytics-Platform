import { prisma } from "@/lib/db";
import { getCaseScopeFilter } from "@/lib/scope";

/**
 * Flat, scoped case list for the Case Records table. Loaded in full
 * (bounded to a `take` cap) and paginated/sorted/filtered client-side in
 * DataTable — the dataset size here (hundreds, not millions, of rows) makes
 * that simpler and just as fast as a server-paginated API.
 */
export async function getCaseRecords(session, take = 500) {
  const scopeFilter = getCaseScopeFilter(session);

  const cases = await prisma.caseMaster.findMany({
    where: scopeFilter,
    orderBy: { CrimeRegisteredDate: "desc" },
    take,
    select: {
      CaseMasterID: true,
      CrimeNo: true,
      CaseNo: true,
      CrimeRegisteredDate: true,
      CrimeMinorHead: { select: { CrimeSubHeadName: true } },
      GravityOffence: { select: { GravityName: true } },
      CaseStatus: { select: { StatusName: true } },
      PoliceStation: { select: { UnitName: true, District: { select: { DistrictID: true, DistrictName: true } } } },
    },
  });

  return cases.map((c) => ({
    id: c.CaseMasterID,
    crimeNo: c.CrimeNo,
    caseNo: c.CaseNo,
    registeredDate: c.CrimeRegisteredDate,
    subHeadName: c.CrimeMinorHead.CrimeSubHeadName,
    gravityName: c.GravityOffence.GravityName,
    statusName: c.CaseStatus.StatusName,
    unitName: c.PoliceStation.UnitName,
    districtId: c.PoliceStation.District?.DistrictID ?? null,
    districtName: c.PoliceStation.District?.DistrictName ?? null,
  }));
}
