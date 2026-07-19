import { zcqlQuery } from "@/lib/zcql";
import { getAggregateDemographics } from "@/lib/demographics";
import { getDistrictHotspots } from "@/lib/geo";

/** Minimal district list for nav UI (command palette "jump to district", etc). */
export async function getDistrictNavList() {
  const districts = await zcqlQuery(
    `SELECT ROWID AS DistrictID, DistrictName FROM District ORDER BY DistrictName ASC`,
    "District"
  );
  return districts.map((d) => ({ id: d.DistrictID, name: d.DistrictName }));
}

export async function getDistrictDrilldown(districtId) {
  if (!Number.isInteger(districtId)) {
    throw new Error("getDistrictDrilldown: districtId must be an integer");
  }

  const districtRows = await zcqlQuery(
    `SELECT ROWID AS DistrictID, DistrictName, CentroidLat, CentroidLng FROM District WHERE ROWID = ${districtId}`,
    "District"
  );
  const district = districtRows[0];
  if (!district) return null;

  const stations = await zcqlQuery(
    `SELECT ROWID AS UnitID, UnitName, Latitude, Longitude FROM Unit WHERE DistrictID = ${districtId}`,
    "Unit"
  );

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const cases = await zcqlQuery(
    `SELECT ROWID AS CaseMasterID, PoliceStationID, CrimeRegisteredDate FROM CaseMaster
     WHERE PoliceStationID IN (SELECT ROWID FROM Unit WHERE DistrictID = ${districtId})`,
    "CaseMaster"
  );

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
  const [allDistricts, allRecentRows] = await Promise.all([
    zcqlQuery(`SELECT ROWID AS DistrictID FROM District`, "District"),
    zcqlQuery(
      `SELECT COUNT(*) AS cnt FROM CaseMaster WHERE CrimeRegisteredDate >= '${since90.toISOString()}'`,
      "CaseMaster"
    ),
  ]);
  const allRecentCases = Number(allRecentRows[0]?.cnt ?? 0);
  const baselineAvgPerDistrict = allDistricts.length > 0 ? allRecentCases / allDistricts.length : 0;
  const comparisonPct =
    baselineAvgPerDistrict > 0 ? Math.round(((recentCaseCount - baselineAvgPerDistrict) / baselineAvgPerDistrict) * 100) : 0;

  const hotspots = await getDistrictHotspots(districtId);
  const demographics = await getAggregateDemographics(cases.map((c) => c.CaseMasterID));

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
