import { prisma } from "@/lib/db";
import { getAggregateDemographics } from "@/lib/demographics";
import { getDistrictHotspots } from "@/lib/geo";

/** Minimal district list for nav UI (command palette "jump to district", etc). */
export async function getDistrictNavList() {
  const districts = await prisma.district.findMany({
    select: { DistrictID: true, DistrictName: true },
    orderBy: { DistrictName: "asc" },
  });
  return districts.map((d) => ({ id: d.DistrictID, name: d.DistrictName }));
}

export async function getDistrictDrilldown(districtId) {
  const district = await prisma.district.findUnique({ where: { DistrictID: districtId } });
  if (!district) return null;

  const stations = await prisma.unit.findMany({ where: { DistrictID: districtId } });

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const cases = await prisma.caseMaster.findMany({
    where: { PoliceStation: { DistrictID: districtId } },
    select: { CaseMasterID: true, PoliceStationID: true, CrimeRegisteredDate: true },
  });

  const countByStation = new Map();
  let recentCaseCount = 0;
  for (const c of cases) {
    countByStation.set(c.PoliceStationID, (countByStation.get(c.PoliceStationID) ?? 0) + 1);
    if (c.CrimeRegisteredDate >= since90) recentCaseCount++;
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
  const allDistrictIds = (await prisma.district.findMany({ select: { DistrictID: true } })).map((d) => d.DistrictID);
  const allRecentCases = await prisma.caseMaster.count({
    where: { CrimeRegisteredDate: { gte: since90 } },
  });
  const baselineAvgPerDistrict = allDistrictIds.length > 0 ? allRecentCases / allDistrictIds.length : 0;
  const comparisonPct =
    baselineAvgPerDistrict > 0 ? Math.round(((recentCaseCount - baselineAvgPerDistrict) / baselineAvgPerDistrict) * 100) : 0;

  let hotspots = [];
  try {
    hotspots = await getDistrictHotspots(districtId);
  } catch {
    // PostGIS geog column may not be populated yet (run `npm run db:geo-setup`).
    hotspots = [];
  }

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
