import { zcqlQuery } from "@/lib/zcql";

/**
 * Aggregate-only demographic correlation over ComplainantDetails. Per the data
 * sensitivity rules, caste/religion/occupation may only ever be surfaced as
 * statistical group counts/percentages — never as a per-record filter, join
 * key, or export. Every function here returns counts, not identifiable rows.
 */

function toBreakdown(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return [];
  return rows
    .filter((r) => r.label !== null)
    .map((r) => ({
      label: r.label,
      count: r.count,
      percentage: Math.round((r.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Manual count-by-id in JS — ZCQL's GROUP BY support isn't confirmed, same approach used elsewhere in this migration. */
function countById(rows, idField) {
  const counts = new Map();
  for (const r of rows) {
    const id = r[idField];
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function groupByCaseIds(complainants, dimension) {
  if (complainants.length === 0) return [];

  if (dimension === "caste") {
    const counts = countById(complainants, "CasteID");
    const castes = await zcqlQuery(`SELECT ROWID AS CasteID, CasteName FROM CasteMaster`, "CasteMaster");
    const nameById = new Map(castes.map((c) => [c.CasteID, c.CasteName]));
    return toBreakdown(
      Array.from(counts.entries()).map(([id, count]) => ({ label: id ? nameById.get(id) ?? null : null, count }))
    );
  }

  if (dimension === "religion") {
    const counts = countById(complainants, "ReligionID");
    const religions = await zcqlQuery(`SELECT ROWID AS ReligionID, ReligionName FROM ReligionMaster`, "ReligionMaster");
    const nameById = new Map(religions.map((r) => [r.ReligionID, r.ReligionName]));
    return toBreakdown(
      Array.from(counts.entries()).map(([id, count]) => ({ label: id ? nameById.get(id) ?? null : null, count }))
    );
  }

  const counts = countById(complainants, "OccupationID");
  const occupations = await zcqlQuery(
    `SELECT ROWID AS OccupationID, OccupationName FROM OccupationMaster`,
    "OccupationMaster"
  );
  const nameById = new Map(occupations.map((o) => [o.OccupationID, o.OccupationName]));
  return toBreakdown(
    Array.from(counts.entries()).map(([id, count]) => ({ label: id ? nameById.get(id) ?? null : null, count }))
  );
}

export async function getAggregateDemographics(caseMasterIds) {
  if (caseMasterIds.length === 0) {
    return { caseCount: 0, byCaste: [], byReligion: [], byOccupation: [], highlights: [] };
  }

  const safeIds = caseMasterIds.filter((id) => Number.isInteger(id));
  const complainants = await zcqlQuery(
    `SELECT CasteID, ReligionID, OccupationID FROM ComplainantDetails WHERE CaseMasterID IN (${safeIds.join(",")})`,
    "ComplainantDetails"
  );

  const [byCaste, byReligion, byOccupation] = await Promise.all([
    groupByCaseIds(complainants, "caste"),
    groupByCaseIds(complainants, "religion"),
    groupByCaseIds(complainants, "occupation"),
  ]);

  const highlights = [];
  if (byOccupation[0]) {
    highlights.push(
      `${byOccupation[0].percentage}% of complainants in this cluster reported "${byOccupation[0].label}" as their occupation.`
    );
  }
  if (byReligion[0] && byReligion[0].percentage < 100) {
    highlights.push(`The largest single group by religion was ${byReligion[0].label} (${byReligion[0].percentage}%).`);
  }

  return {
    caseCount: caseMasterIds.length,
    byCaste,
    byReligion,
    byOccupation,
    highlights,
  };
}
