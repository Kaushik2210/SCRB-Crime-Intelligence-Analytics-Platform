import { prisma } from "@/lib/db";
import { getCaseScopeFilter } from "@/lib/scope";
import { getRiskTiles, getAnomalyAlerts } from "@/lib/risk";

export async function getDashboardSummary(session) {
  const scopeFilter = getCaseScopeFilter(session);

  const now = new Date();
  const cutoff90 = new Date(now);
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoff180 = new Date(now);
  cutoff180.setDate(cutoff180.getDate() - 180);

  const [totalCases, recentCases, priorCases, riskTiles, anomalies] = await Promise.all([
    prisma.caseMaster.count({ where: scopeFilter }),
    prisma.caseMaster.count({ where: { ...scopeFilter, CrimeRegisteredDate: { gte: cutoff90 } } }),
    prisma.caseMaster.count({
      where: { ...scopeFilter, CrimeRegisteredDate: { gte: cutoff180, lt: cutoff90 } },
    }),
    getRiskTiles(scopeFilter),
    getAnomalyAlerts(scopeFilter),
  ]);

  const trendPct = priorCases === 0 ? 0 : Math.round(((recentCases - priorCases) / priorCases) * 100);
  const hotspotCount = riskTiles.filter((t) => t.tier >= 4).length;

  let mapPoints = [];
  let mapCenter = { lat: 15.3173, lng: 75.7139, zoom: 6.2 };

  if (session.isStateLevel) {
    const cases = await prisma.caseMaster.findMany({
      where: scopeFilter,
      select: { PoliceStation: { select: { DistrictID: true } } },
    });
    const countByDistrict = new Map();
    for (const c of cases) {
      const id = c.PoliceStation.DistrictID;
      if (id == null) continue;
      countByDistrict.set(id, (countByDistrict.get(id) ?? 0) + 1);
    }
    const districts = await prisma.district.findMany();
    mapPoints = districts
      .filter((d) => countByDistrict.has(d.DistrictID))
      .map((d) => ({
        id: d.DistrictID,
        lat: d.CentroidLat,
        lng: d.CentroidLng,
        weight: countByDistrict.get(d.DistrictID) ?? 0,
        label: `${d.DistrictName}: ${countByDistrict.get(d.DistrictID)} cases`,
        colorVar: "--chart-4",
      }));
  } else if (session.districtId != null) {
    const district = await prisma.district.findUnique({ where: { DistrictID: session.districtId } });
    if (district) mapCenter = { lat: district.CentroidLat, lng: district.CentroidLng, zoom: 9.5 };

    const cases = await prisma.caseMaster.findMany({
      where: scopeFilter,
      select: { PoliceStationID: true },
    });
    const countByStation = new Map();
    for (const c of cases) {
      countByStation.set(c.PoliceStationID, (countByStation.get(c.PoliceStationID) ?? 0) + 1);
    }
    const stations = await prisma.unit.findMany({ where: { DistrictID: session.districtId } });
    mapPoints = stations
      .filter((s) => countByStation.has(s.UnitID) && s.Latitude != null && s.Longitude != null)
      .map((s) => ({
        id: s.UnitID,
        lat: s.Latitude,
        lng: s.Longitude,
        weight: countByStation.get(s.UnitID) ?? 0,
        label: `${s.UnitName}: ${countByStation.get(s.UnitID)} cases`,
        colorVar: "--chart-2",
      }));
  }

  const [trendSeries, topCategories] = await Promise.all([
    getTrendSeries(scopeFilter),
    getTopCategories(scopeFilter, cutoff90),
  ]);

  const strategicSummary = session.isStateLevel
    ? `Statewide, ${recentCases} cases were registered in the last 90 days across ${mapPoints.length} districts (${trendPct >= 0 ? "+" : ""}${trendPct}% vs. the prior period). ${hotspotCount} localities show elevated risk and ${anomalies.length} categories are trending above their historical baseline.`
    : `${session.districtName} registered ${recentCases} cases in the last 90 days (${trendPct >= 0 ? "+" : ""}${trendPct}% vs. the prior period), with ${hotspotCount} station/category combinations showing elevated risk.`;

  return {
    totalCases,
    recentCases,
    trendPct,
    hotspotCount,
    anomalyCount: anomalies.length,
    mapPoints,
    mapCenter,
    strategicSummary,
    trendSeries,
    topCategories,
  };
}

const TREND_WEEKS = 12;

/** Weekly case counts for the last 12 weeks, scoped to the caller's jurisdiction. */
async function getTrendSeries(scopeFilter) {
  const since = new Date();
  since.setDate(since.getDate() - TREND_WEEKS * 7);

  const cases = await prisma.caseMaster.findMany({
    where: { ...scopeFilter, CrimeRegisteredDate: { gte: since } },
    select: { CrimeRegisteredDate: true },
  });

  const now = Date.now();
  const buckets = Array.from({ length: TREND_WEEKS }, () => 0);
  for (const c of cases) {
    const ageDays = (now - c.CrimeRegisteredDate.getTime()) / (1000 * 60 * 60 * 24);
    const weekIndex = TREND_WEEKS - 1 - Math.floor(ageDays / 7);
    if (weekIndex >= 0 && weekIndex < TREND_WEEKS) buckets[weekIndex]++;
  }

  return buckets.map((count, i) => ({
    week: `W${i + 1}`,
    count,
  }));
}

/** Top 5 crime sub-heads by recent (last-90-day) case count, scoped. */
async function getTopCategories(scopeFilter, cutoff90) {
  const rows = await prisma.caseMaster.groupBy({
    by: ["CrimeMinorHeadID"],
    where: { ...scopeFilter, CrimeRegisteredDate: { gte: cutoff90 } },
    _count: { _all: true },
    orderBy: { _count: { CrimeMinorHeadID: "desc" } },
    take: 5,
  });
  if (rows.length === 0) return [];

  const subHeads = await prisma.crimeSubHead.findMany({
    where: { CrimeSubHeadID: { in: rows.map((r) => r.CrimeMinorHeadID) } },
  });
  const nameById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName]));

  return rows.map((r) => ({
    name: nameById.get(r.CrimeMinorHeadID) ?? "Unknown",
    count: r._count._all,
  }));
}
