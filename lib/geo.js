import { zcqlQuery } from "@/lib/zcql";
import { toDbDate } from "@/lib/dbDate";
import { assertRowId } from "@/lib/rowId";

/**
 * Hotspot detection without PostGIS: Catalyst Data Store has no spatial
 * extension, so clustering runs in-process over plain Latitude/Longitude
 * columns — an O(n^2) distance-threshold DBSCAN, adequate for a single
 * district's case count (this replaces the old ST_ClusterDBSCAN raw SQL and
 * its PostGIS-unavailable fallback with a single, always-available path).
 *
 * `epsKm` ~2km is a reasonable hotspot radius for a district-level demo.
 * `minPoints` is the minimum cluster size before DBSCAN calls it a hotspot.
 * `sinceDays`, when set, restricts clustering to cases registered in that
 * many trailing days — powers the district page's time-range slider.
 */
export async function getDistrictHotspots(districtId, opts = {}) {
  assertRowId(districtId, "getDistrictHotspots: districtId");
  const epsKm = opts.epsKm ?? 2;
  const minPoints = opts.minPoints ?? 3;
  const since = opts.sinceDays ? daysAgo(opts.sinceDays) : null;

  const cases = await zcqlQuery(
    // CaseMaster's coordinate columns are lowercase in the ER diagram; alias
    // them to the capitalized names this module's clustering code uses.
    `SELECT ROWID AS CaseMasterID, latitude AS Latitude, longitude AS Longitude FROM CaseMaster
     WHERE PoliceStationID IN (SELECT ROWID FROM Unit WHERE DistrictID = ${districtId})
     ${since ? `AND CrimeRegisteredDate >= '${toDbDate(since)}'` : ""}`,
    "CaseMaster"
  );

  return clusterByDistance(cases, epsKm, minPoints);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two lat/lng points, in kilometers. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/** Naive O(n^2) distance-threshold clustering — fine at single-district scale. */
function clusterByDistance(cases, epsKm, minPoints) {
  const visited = new Set();
  const clusters = [];
  let clusterId = 0;

  for (const point of cases) {
    if (visited.has(point.CaseMasterID)) continue;
    const neighbors = cases.filter(
      (c) => haversineKm(c.Latitude, c.Longitude, point.Latitude, point.Longitude) <= epsKm
    );
    if (neighbors.length < minPoints) continue;

    neighbors.forEach((n) => visited.add(n.CaseMasterID));
    clusters.push({
      clusterId: clusterId++,
      caseCount: neighbors.length,
      lat: neighbors.reduce((sum, n) => sum + n.Latitude, 0) / neighbors.length,
      lng: neighbors.reduce((sum, n) => sum + n.Longitude, 0) / neighbors.length,
    });
  }

  return clusters.sort((a, b) => b.caseCount - a.caseCount);
}

/** Cases within `radiusKm` of a point, nearest first — used for proximity-style queries. */
export async function getCasesNearPoint(lat, lng, radiusKm) {
  // Data Store has no spatial index, so this scans CaseMaster and filters/sorts
  // in-process. Fine at seeded-dataset scale; revisit if the table grows large
  // (e.g. a bounding-box WHERE clause first, to cut what's pulled over the wire).
  const cases = await zcqlQuery(
    `SELECT ROWID AS CaseMasterID, latitude AS Latitude, longitude AS Longitude FROM CaseMaster`,
    "CaseMaster"
  );

  return cases
    .map((c) => ({ CaseMasterID: c.CaseMasterID, distance_km: haversineKm(lat, lng, c.Latitude, c.Longitude) }))
    .filter((c) => c.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}
