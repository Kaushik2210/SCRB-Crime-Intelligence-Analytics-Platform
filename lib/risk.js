import { zcqlQuery } from "@/lib/zcql";

const RECENT_WINDOW_DAYS = 90;
const BASELINE_WINDOW_DAYS = 270; // the 3 prior 90-day windows
const BASELINE_PERIODS = BASELINE_WINDOW_DAYS / RECENT_WINDOW_DAYS;

/**
 * Loads the raw case rows needed for risk/anomaly computation, respecting
 * whatever caller-supplied scope filter (from lib/scope.js) restricts the
 * result to the requesting employee's jurisdiction.
 */
async function loadScopedCases(scopeFilter) {
  const since = new Date();
  since.setDate(since.getDate() - BASELINE_WINDOW_DAYS - RECENT_WINDOW_DAYS);

  return zcqlQuery(
    `SELECT PoliceStationID, CrimeMinorHeadID, CrimeRegisteredDate, GravityOffenceID
     FROM CaseMaster
     WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${since.toISOString()}'`,
    "CaseMaster"
  );
}

function scoreToTier(score) {
  return Math.min(5, Math.max(1, Math.ceil(score / 20)));
}

export async function getRiskTiles(scopeFilter) {
  const rows = await loadScopedCases(scopeFilter);
  if (rows.length === 0) return [];

  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_WINDOW_DAYS);

  const [units, districts, subHeads, gravities] = await Promise.all([
    zcqlQuery(`SELECT ROWID AS UnitID, UnitName, DistrictID FROM Unit`, "Unit"),
    zcqlQuery(`SELECT ROWID AS DistrictID, DistrictName FROM District`, "District"),
    zcqlQuery(`SELECT ROWID AS CrimeSubHeadID, CrimeSubHeadName FROM CrimeSubHead`, "CrimeSubHead"),
    zcqlQuery(`SELECT ROWID AS GravityOffenceID, GravityName FROM GravityOffence`, "GravityOffence"),
  ]);
  const districtNameById = new Map(districts.map((d) => [d.DistrictID, d.DistrictName]));
  const unitById = new Map(units.map((u) => [u.UnitID, u]));
  const subHeadById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s]));
  const heinousId = gravities.find((g) => g.GravityName === "Heinous")?.GravityOffenceID;

  const buckets = new Map();

  for (const row of rows) {
    const key = `${row.PoliceStationID}::${row.CrimeMinorHeadID}`;
    const bucket = buckets.get(key) ?? { recent: 0, baseline: 0, heinousRecent: 0 };
    const isRecent = new Date(row.CrimeRegisteredDate) >= recentCutoff;
    if (isRecent) {
      bucket.recent += 1;
      if (row.GravityOffenceID === heinousId) bucket.heinousRecent += 1;
    } else {
      bucket.baseline += 1;
    }
    buckets.set(key, bucket);
  }

  const maxRecent = Math.max(...Array.from(buckets.values()).map((b) => b.recent), 1);

  const tiles = [];
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.recent === 0) continue;
    const [unitIdStr, subHeadIdStr] = key.split("::");
    const unit = unitById.get(Number(unitIdStr));
    const subHead = subHeadById.get(Number(subHeadIdStr));
    if (!unit || !subHead) continue;

    const baselineAvgPer90 = bucket.baseline / BASELINE_PERIODS;
    const ratio = bucket.recent / (baselineAvgPer90 + 0.5);
    const heinousFraction = bucket.heinousRecent / bucket.recent;

    const volumeScore = Math.min(bucket.recent / maxRecent, 1) * 60;
    const velocityScore = Math.min(ratio / 3, 1) * 25;
    const gravityScore = heinousFraction * 15;
    const score = Math.round(volumeScore + velocityScore + gravityScore);

    tiles.push({
      unitId: unit.UnitID,
      unitName: unit.UnitName,
      districtId: unit.DistrictID,
      districtName: unit.DistrictID != null ? districtNameById.get(unit.DistrictID) ?? null : null,
      crimeSubHeadId: subHead.CrimeSubHeadID,
      crimeSubHeadName: subHead.CrimeSubHeadName,
      recentCount: bucket.recent,
      baselineAvgPer90: Math.round(baselineAvgPer90 * 10) / 10,
      score,
      tier: scoreToTier(score),
    });
  }

  return tiles.sort((a, b) => b.score - a.score);
}

export async function getAnomalyAlerts(scopeFilter) {
  const tiles = await getRiskTiles(scopeFilter);
  const anomalies = [];

  for (const tile of tiles) {
    const ratio = tile.recentCount / (tile.baselineAvgPer90 + 0.5);
    if (ratio < 1.75 || tile.recentCount < 3) continue;
    const pct = Math.round((ratio - 1) * 100);
    anomalies.push({
      unitId: tile.unitId,
      unitName: tile.unitName,
      districtId: tile.districtId,
      districtName: tile.districtName,
      crimeSubHeadName: tile.crimeSubHeadName,
      recentCount: tile.recentCount,
      baselineAvgPer90: tile.baselineAvgPer90,
      ratio: Math.round(ratio * 100) / 100,
      message: `${tile.crimeSubHeadName} cases at ${tile.unitName} are up ${pct}% versus its usual pace — ${tile.recentCount} in the last ${RECENT_WINDOW_DAYS} days against a typical ${tile.baselineAvgPer90.toFixed(1)}.`,
    });
  }

  return anomalies.sort((a, b) => b.ratio - a.ratio);
}
