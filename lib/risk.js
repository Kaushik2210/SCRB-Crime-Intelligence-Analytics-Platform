import { zcqlQuery } from "@/lib/zcql";
import { predictNextQuarterCounts } from "@/lib/riskModel";
import { memoizePerRequest } from "@/lib/catalystContext";
import { getOrSetTTL } from "@/lib/ttlCache";
import { getUnits, getDistricts, getCrimeSubHeads, getGravityOffences } from "@/lib/lookups";
import { toDbDate } from "@/lib/dbDate";

const RECENT_WINDOW_DAYS = 90;
const BASELINE_WINDOW_DAYS = 270; // the 3 prior 90-day windows
const BASELINE_PERIODS = BASELINE_WINDOW_DAYS / RECENT_WINDOW_DAYS;
const MODEL_HISTORY_DAYS = 720; // ~8 quarters, for lib/riskModel.js's forecast
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // case data doesn't change fast enough to need retraining every request

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
     WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${toDbDate(since)}'`,
    "CaseMaster"
  );
}

/** Wider history than loadScopedCases, purely to feed the ML forecast in lib/riskModel.js. */
async function loadHistoryForModel(scopeFilter, heinousId) {
  const since = new Date();
  since.setDate(since.getDate() - MODEL_HISTORY_DAYS);

  const rows = await zcqlQuery(
    `SELECT PoliceStationID, CrimeMinorHeadID, CrimeRegisteredDate, GravityOffenceID
     FROM CaseMaster
     WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${toDbDate(since)}'`,
    "CaseMaster"
  );
  return rows.map((r) => ({ ...r, isHeinous: r.GravityOffenceID === heinousId }));
}

function scoreToTier(score) {
  return Math.min(5, Math.max(1, Math.ceil(score / 20)));
}

/**
 * Memoized per-request (see lib/catalystContext.js): unrelated call sites
 * within one request/render tree — notably app/(app)/layout.jsx's
 * notification-bell fetch and whichever page is being rendered — can each
 * need risk tiles for the same scopeFilter. Without this, both would
 * independently redo several ZCQL round-trips and retrain
 * lib/riskModel.js's Random Forest from scratch.
 */
export function getRiskTiles(scopeFilter) {
  return memoizePerRequest(`riskTiles:${scopeFilter}`, () => computeRiskTiles(scopeFilter));
}

async function computeRiskTiles(scopeFilter) {
  const rows = await loadScopedCases(scopeFilter);
  if (rows.length === 0) return [];

  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_WINDOW_DAYS);

  const [units, districts, subHeads, gravities] = await Promise.all([
    getUnits(),
    getDistricts(),
    getCrimeSubHeads(),
    getGravityOffences(),
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

  // ML forecast (lib/riskModel.js) — additive only: existing score/tier below
  // are unchanged, so this can't alter any already-shipped UI behavior.
  // Errors here (e.g. too little history) degrade to "no forecast" per bucket
  // rather than breaking the whole risk tile list. Cached for a few minutes
  // (lib/ttlCache.js) since retraining a Random Forest on every request —
  // across every user viewing dashboard/risk/alerts — isn't free, and case
  // data doesn't shift meaningfully within that window.
  let predictedByBucket = new Map();
  try {
    predictedByBucket = await getOrSetTTL(`riskForecast:${scopeFilter}`, MODEL_CACHE_TTL_MS, async () => {
      const history = await loadHistoryForModel(scopeFilter, heinousId);
      return predictNextQuarterCounts(history);
    });
  } catch (err) {
    console.error("Risk forecast model failed, continuing without it:", err);
  }

  const tiles = [];
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.recent === 0) continue;
    // Catalyst ROWIDs are 17-digit ids that exceed Number.MAX_SAFE_INTEGER, so
    // they're kept as strings end-to-end — `Number(id)` would both lose
    // precision and miss these string-keyed Maps entirely.
    const [unitId, subHeadId] = key.split("::");
    const unit = unitById.get(unitId);
    const subHead = subHeadById.get(subHeadId);
    if (!unit || !subHead) continue;

    const baselineAvgPer90 = bucket.baseline / BASELINE_PERIODS;
    const ratio = bucket.recent / (baselineAvgPer90 + 0.5);
    const heinousFraction = bucket.heinousRecent / bucket.recent;

    const volumeScore = Math.min(bucket.recent / maxRecent, 1) * 60;
    const velocityScore = Math.min(ratio / 3, 1) * 25;
    const gravityScore = heinousFraction * 15;
    const score = Math.round(volumeScore + velocityScore + gravityScore);

    const predictedNextCount = predictedByBucket.has(key)
      ? Math.round(predictedByBucket.get(key) * 10) / 10
      : null;
    const trendDirection =
      predictedNextCount == null
        ? null
        : predictedNextCount > bucket.recent * 1.1
          ? "rising"
          : predictedNextCount < bucket.recent * 0.9
            ? "falling"
            : "stable";

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
      predictedNextCount,
      trendDirection,
    });
  }

  return tiles.sort((a, b) => b.score - a.score);
}

/**
 * Pure — derives anomalies from already-computed tiles. Split out from
 * getAnomalyAlerts so callers that already have tiles (e.g. a page that also
 * renders the tile grid) don't trigger a second, redundant getRiskTiles
 * computation — that function does several ZCQL round-trips plus training a
 * fresh Random Forest (lib/riskModel.js) on every call, so recomputing it a
 * second time per page load is not free.
 */
export function anomaliesFromTiles(tiles) {
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

/** Convenience wrapper for callers that only need anomalies, not the tiles themselves. */
export async function getAnomalyAlerts(scopeFilter) {
  const tiles = await getRiskTiles(scopeFilter);
  return anomaliesFromTiles(tiles);
}
