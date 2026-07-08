import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Real PostGIS hotspot detection: DBSCAN-clusters CaseMaster points (via the
 * `geog` geography column populated by prisma/geo-setup.js) within a district,
 * returning cluster centroids and sizes for the heatmap layer.
 *
 * `epsDegrees` ~ 0.02 is roughly a 2km radius at Karnataka's latitude — coarse,
 * but adequate for a district-level demo heatmap. `minPoints` is the minimum
 * cluster size DBSCAN requires before it calls something a hotspot.
 */
export async function getDistrictHotspots(districtId, opts = {}) {
  const eps = opts.epsDegrees ?? 0.02;
  const minPoints = opts.minPoints ?? 3;

  try {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT cluster_id, count(*)::int as case_count,
             avg(ST_Y(geog::geometry)) as lat,
             avg(ST_X(geog::geometry)) as lng
      FROM (
        SELECT cm."CaseMasterID", cm.geog,
          ST_ClusterDBSCAN(cm.geog::geometry, eps := ${eps}, minpoints := ${minPoints}) OVER () as cluster_id
        FROM case_master cm
        JOIN unit u ON cm."PoliceStationID" = u."UnitID"
        WHERE u."DistrictID" = ${districtId} AND cm.geog IS NOT NULL
      ) sub
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      ORDER BY case_count DESC
    `);

    return rows.map((r) => ({
      clusterId: r.cluster_id,
      caseCount: Number(r.case_count),
      lat: r.lat,
      lng: r.lng,
    }));
  } catch {
    // PostGIS isn't available on this server (see prisma/geo-setup.js) — fall
    // back to a plain JS distance-threshold clustering over Latitude/Longitude
    // so the hotspot feature still works, just without real geospatial indexing.
    return getDistrictHotspotsFallback(districtId, eps, minPoints);
  }
}

/** Non-PostGIS fallback: naive O(n^2) distance clustering in degrees (adequate for a single district's case count). */
async function getDistrictHotspotsFallback(districtId, epsDegrees, minPoints) {
  const cases = await prisma.caseMaster.findMany({
    where: { PoliceStation: { DistrictID: districtId } },
    select: { CaseMasterID: true, Latitude: true, Longitude: true },
  });

  const visited = new Set();
  const clusters = [];
  let clusterId = 0;

  for (const point of cases) {
    if (visited.has(point.CaseMasterID)) continue;
    const neighbors = cases.filter(
      (c) => Math.hypot(c.Latitude - point.Latitude, c.Longitude - point.Longitude) <= epsDegrees
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

/** Cases within `radiusMeters` of a point — used for proximity-style queries. */
export async function getCasesNearPoint(lat, lng, radiusMeters) {
  return prisma.$queryRaw(Prisma.sql`
    SELECT "CaseMasterID", ST_Distance(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as distance_m
    FROM case_master
    WHERE ST_DWithin(geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    ORDER BY distance_m ASC
  `);
}
