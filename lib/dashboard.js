import { zcqlQuery } from "@/lib/zcql";
import { getCaseScopeFilter } from "@/lib/scope";
import { getRiskTiles, getAnomalyAlerts } from "@/lib/risk";

/** COUNT(*) queries alias to `cnt` — see lib/zcql.js's normalizeRow note on aggregate-row shape. */
async function countCases(whereClause) {
  const rows = await zcqlQuery(`SELECT COUNT(*) AS cnt FROM CaseMaster WHERE ${whereClause}`, "CaseMaster");
  return Number(rows[0]?.cnt ?? 0);
}

export async function getDashboardSummary(session) {
  const scopeFilter = getCaseScopeFilter(session);

  const now = new Date();
  const cutoff90 = new Date(now);
  cutoff90.setDate(cutoff90.getDate() - 90);
  const cutoff180 = new Date(now);
  cutoff180.setDate(cutoff180.getDate() - 180);

  const [totalCases, recentCases, priorCases, riskTiles, anomalies] = await Promise.all([
    countCases(scopeFilter),
    countCases(`${scopeFilter} AND CrimeRegisteredDate >= '${cutoff90.toISOString()}'`),
    countCases(
      `${scopeFilter} AND CrimeRegisteredDate >= '${cutoff180.toISOString()}' AND CrimeRegisteredDate < '${cutoff90.toISOString()}'`
    ),
    getRiskTiles(scopeFilter),
    getAnomalyAlerts(scopeFilter),
  ]);

  const trendPct = priorCases === 0 ? 0 : Math.round(((recentCases - priorCases) / priorCases) * 100);
  const hotspotCount = riskTiles.filter((t) => t.tier >= 4).length;

  let mapPoints = [];
  let mapCenter = { lat: 15.3173, lng: 75.7139, zoom: 6.2 };

  if (session.isStateLevel) {
    const [cases, units, districts] = await Promise.all([
      zcqlQuery(`SELECT PoliceStationID FROM CaseMaster WHERE ${scopeFilter}`, "CaseMaster"),
      zcqlQuery(`SELECT ROWID AS UnitID, DistrictID FROM Unit`, "Unit"),
      zcqlQuery(`SELECT ROWID AS DistrictID, DistrictName, CentroidLat, CentroidLng FROM District`, "District"),
    ]);
    const districtIdByUnitId = new Map(units.map((u) => [u.UnitID, u.DistrictID]));
    const countByDistrict = new Map();
    for (const c of cases) {
      const id = districtIdByUnitId.get(c.PoliceStationID);
      if (id == null) continue;
      countByDistrict.set(id, (countByDistrict.get(id) ?? 0) + 1);
    }
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
    const districtRows = await zcqlQuery(
      `SELECT ROWID AS DistrictID, CentroidLat, CentroidLng FROM District WHERE ROWID = ${session.districtId}`,
      "District"
    );
    const district = districtRows[0];
    if (district) mapCenter = { lat: district.CentroidLat, lng: district.CentroidLng, zoom: 9.5 };

    const [cases, stations] = await Promise.all([
      zcqlQuery(`SELECT PoliceStationID FROM CaseMaster WHERE ${scopeFilter}`, "CaseMaster"),
      zcqlQuery(
        `SELECT ROWID AS UnitID, UnitName, Latitude, Longitude FROM Unit WHERE DistrictID = ${session.districtId}`,
        "Unit"
      ),
    ]);
    const countByStation = new Map();
    for (const c of cases) {
      countByStation.set(c.PoliceStationID, (countByStation.get(c.PoliceStationID) ?? 0) + 1);
    }
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

  const cases = await zcqlQuery(
    `SELECT CrimeRegisteredDate FROM CaseMaster WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${since.toISOString()}'`,
    "CaseMaster"
  );

  const now = Date.now();
  const buckets = Array.from({ length: TREND_WEEKS }, () => 0);
  for (const c of cases) {
    const ageDays = (now - new Date(c.CrimeRegisteredDate).getTime()) / (1000 * 60 * 60 * 24);
    const weekIndex = TREND_WEEKS - 1 - Math.floor(ageDays / 7);
    if (weekIndex >= 0 && weekIndex < TREND_WEEKS) buckets[weekIndex]++;
  }

  return buckets.map((count, i) => ({
    week: `W${i + 1}`,
    count,
  }));
}

/**
 * Top 5 crime sub-heads by recent (last-90-day) case count, scoped.
 * ZCQL's GROUP BY support isn't confirmed against a live project, so this
 * pulls the (bounded, scoped) minor-head ids and counts them in JS instead
 * of relying on `GROUP BY`/`COUNT` — same manual-aggregation approach used
 * throughout this migration wherever a query shape is uncertain.
 */
async function getTopCategories(scopeFilter, cutoff90) {
  const [cases, subHeads] = await Promise.all([
    zcqlQuery(
      `SELECT CrimeMinorHeadID FROM CaseMaster WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${cutoff90.toISOString()}'`,
      "CaseMaster"
    ),
    zcqlQuery(`SELECT ROWID AS CrimeSubHeadID, CrimeSubHeadName FROM CrimeSubHead`, "CrimeSubHead"),
  ]);
  if (cases.length === 0) return [];

  const countById = new Map();
  for (const c of cases) {
    countById.set(c.CrimeMinorHeadID, (countById.get(c.CrimeMinorHeadID) ?? 0) + 1);
  }
  const nameById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName]));

  return Array.from(countById.entries())
    .map(([id, count]) => ({ name: nameById.get(id) ?? "Unknown", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
