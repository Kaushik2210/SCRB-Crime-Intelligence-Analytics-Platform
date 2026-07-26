import { zcqlQuery } from "@/lib/zcql";
import { getAggregateDemographics } from "@/lib/demographics";
import { getDistrictHotspots } from "@/lib/geo";
import { getDistricts, getUnits } from "@/lib/lookups";
import { toDbDate } from "@/lib/dbDate";
import { countQuery, readCount } from "@/lib/zcqlCount";
import { assertRowId, sameRowId } from "@/lib/rowId";

/** Minimal district list for nav UI (command palette "jump to district", etc). */
export async function getDistrictNavList() {
  const districts = await getDistricts();
  return districts
    .map((d) => ({ id: d.DistrictID, name: d.DistrictName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDistrictDrilldown(districtId) {
  assertRowId(districtId, "getDistrictDrilldown: districtId");

  const [districts, units] = await Promise.all([getDistricts(), getUnits()]);
  const district = districts.find((d) => sameRowId(d.DistrictID, districtId));
  if (!district) return null;

  const stations = units.filter((u) => sameRowId(u.DistrictID, districtId));

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  // Independent queries — this district's cases and the statewide recent
  // count don't depend on each other, so fetch both at once.
  const [cases, allRecentRows] = await Promise.all([
    zcqlQuery(
      `SELECT ROWID AS CaseMasterID, PoliceStationID, CrimeRegisteredDate FROM CaseMaster
       WHERE PoliceStationID IN (SELECT ROWID FROM Unit WHERE DistrictID = ${districtId})`,
      "CaseMaster"
    ),
    zcqlQuery(
      countQuery("CaseMaster", `CrimeRegisteredDate >= '${toDbDate(since90)}'`),
      "CaseMaster"
    ),
  ]);

  const countByStation = new Map();
  let recentCaseCount = 0;
  for (const c of cases) {
    countByStation.set(c.PoliceStationID, (countByStation.get(c.PoliceStationID) ?? 0) + 1);
    if (new Date(c.CrimeRegisteredDate) >= since90) recentCaseCount++;
  }

  const stationPoints = stations
    .filter((s) => s.Latitude != null && s.Longitude != null)
    .map((s) => ({
      id: s.UnitID,
      lat: s.Latitude,
      lng: s.Longitude,
      weight: countByStation.get(s.UnitID) ?? 0,
      label: `${s.UnitName}: ${countByStation.get(s.UnitID) ?? 0} cases`,
      colorVar: "--chart-2",
    }));

  // Statewide baseline: average recent-90-day case count per district, for comparison.
  const allRecentCases = readCount(allRecentRows);
  const baselineAvgPerDistrict = districts.length > 0 ? allRecentCases / districts.length : 0;
  const comparisonPct =
    baselineAvgPerDistrict > 0 ? Math.round(((recentCaseCount - baselineAvgPerDistrict) / baselineAvgPerDistrict) * 100) : 0;

  // Independent of each other — run in parallel rather than sequentially.
  const [hotspots, demographics] = await Promise.all([
    getDistrictHotspots(districtId),
    getAggregateDemographics(cases.map((c) => c.CaseMasterID)),
  ]);

  return {
    districtId: district.DistrictID,
    districtName: district.DistrictName,
    center: { lat: district.CentroidLat, lng: district.CentroidLng },
    stationPoints,
    hotspots,
    recentCaseCount,
    baselineAvgPerDistrict: Math.round(baselineAvgPerDistrict * 10) / 10,
    comparisonPct,
    demographics,
  };
}
