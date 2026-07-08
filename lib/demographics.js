import { prisma } from "@/lib/db";

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

async function groupByCaseIds(caseMasterIds, dimension) {
  if (caseMasterIds.length === 0) return [];

  if (dimension === "caste") {
    const rows = await prisma.complainantDetails.groupBy({
      by: ["CasteID"],
      where: { CaseMasterID: { in: caseMasterIds } },
      _count: { _all: true },
    });
    const castes = await prisma.casteMaster.findMany();
    const nameById = new Map(castes.map((c) => [c.CasteID, c.CasteName]));
    return toBreakdown(
      rows.map((r) => ({ label: r.CasteID ? nameById.get(r.CasteID) ?? null : null, count: r._count._all }))
    );
  }

  if (dimension === "religion") {
    const rows = await prisma.complainantDetails.groupBy({
      by: ["ReligionID"],
      where: { CaseMasterID: { in: caseMasterIds } },
      _count: { _all: true },
    });
    const religions = await prisma.religionMaster.findMany();
    const nameById = new Map(religions.map((r) => [r.ReligionID, r.ReligionName]));
    return toBreakdown(
      rows.map((r) => ({ label: r.ReligionID ? nameById.get(r.ReligionID) ?? null : null, count: r._count._all }))
    );
  }

  const rows = await prisma.complainantDetails.groupBy({
    by: ["OccupationID"],
    where: { CaseMasterID: { in: caseMasterIds } },
    _count: { _all: true },
  });
  const occupations = await prisma.occupationMaster.findMany();
  const nameById = new Map(occupations.map((o) => [o.OccupationID, o.OccupationName]));
  return toBreakdown(
    rows.map((r) => ({ label: r.OccupationID ? nameById.get(r.OccupationID) ?? null : null, count: r._count._all }))
  );
}

export async function getAggregateDemographics(caseMasterIds) {
  const [byCaste, byReligion, byOccupation] = await Promise.all([
    groupByCaseIds(caseMasterIds, "caste"),
    groupByCaseIds(caseMasterIds, "religion"),
    groupByCaseIds(caseMasterIds, "occupation"),
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
