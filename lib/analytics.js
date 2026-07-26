import { zcqlQuery } from "@/lib/zcql";
import { getCrimeHeads, getCrimeSubHeads, getCaseCategories, getCaseStatuses } from "@/lib/lookups";
import { toDbDate } from "@/lib/dbDate";

async function loadLookups() {
  const [heads, subHeads, categories, statuses] = await Promise.all([
    getCrimeHeads(),
    getCrimeSubHeads(),
    getCaseCategories(),
    getCaseStatuses(),
  ]);
  return {
    headNameById: new Map(heads.map((h) => [h.CrimeHeadID, h.CrimeHeadName])),
    subHeadNameById: new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName])),
    categoryNameById: new Map(categories.map((c) => [c.CaseCategoryID, c.CategoryName])),
    statusNameById: new Map(statuses.map((s) => [s.CaseStatusID, s.StatusName])),
  };
}

/**
 * Two-level treemap data (CrimeHead -> CrimeSubHead) by recent case volume,
 * scoped to the caller's jurisdiction. Powers the Treemap on the Risk page.
 */
export async function getCategoryTreemap(scopeFilter, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [cases, { headNameById, subHeadNameById }] = await Promise.all([
    zcqlQuery(
      `SELECT CrimeMajorHeadID, CrimeMinorHeadID FROM CaseMaster
       WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${toDbDate(since)}'`,
      "CaseMaster"
    ),
    loadLookups(),
  ]);

  const headMap = new Map(); // headName -> Map(subHeadName -> count)
  for (const c of cases) {
    const headName = headNameById.get(c.CrimeMajorHeadID) ?? "Unknown";
    const subName = subHeadNameById.get(c.CrimeMinorHeadID) ?? "Unknown";
    const subMap = headMap.get(headName) ?? new Map();
    subMap.set(subName, (subMap.get(subName) ?? 0) + 1);
    headMap.set(headName, subMap);
  }

  return Array.from(headMap.entries()).map(([name, subMap]) => ({
    name,
    children: Array.from(subMap.entries()).map(([subName, size]) => ({ name: subName, size })),
  }));
}

/**
 * Sankey flow data: FIR category -> crime head -> case outcome, scoped.
 * Uses a wider window than most other views (180d) since a 3-stage flow
 * needs enough volume per path to be legible.
 */
export async function getCaseFlowSankey(scopeFilter, days = 180) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [cases, { headNameById, categoryNameById, statusNameById }] = await Promise.all([
    zcqlQuery(
      `SELECT CaseCategoryID, CrimeMajorHeadID, CaseStatusID FROM CaseMaster
       WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${toDbDate(since)}'`,
      "CaseMaster"
    ),
    loadLookups(),
  ]);

  if (cases.length === 0) return { nodes: [], links: [] };

  const nodeIndex = new Map();
  function nodeId(label) {
    if (!nodeIndex.has(label)) nodeIndex.set(label, nodeIndex.size);
    return nodeIndex.get(label);
  }

  const linkWeights = new Map(); // "sourceId->targetId" -> count
  function addLink(sourceLabel, targetLabel) {
    const key = `${nodeId(sourceLabel)}->${nodeId(targetLabel)}`;
    linkWeights.set(key, (linkWeights.get(key) ?? 0) + 1);
  }

  for (const c of cases) {
    const category = categoryNameById.get(c.CaseCategoryID) ?? "Unknown";
    const head = headNameById.get(c.CrimeMajorHeadID) ?? "Unknown";
    const status = statusNameById.get(c.CaseStatusID) ?? "Unknown";
    addLink(category, head);
    addLink(head, status);
  }

  const nodes = Array.from(nodeIndex.keys()).map((name) => ({ name }));
  const links = Array.from(linkWeights.entries()).map(([key, value]) => {
    const [source, target] = key.split("->").map(Number);
    return { source, target, value };
  });

  return { nodes, links };
}

/**
 * Daily case counts for the trailing `days` (default ~53 weeks) — powers a
 * GitHub-style calendar heatmap of temporal case density.
 */
export async function getDailyCaseCounts(scopeFilter, days = 371) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const cases = await zcqlQuery(
    `SELECT CrimeRegisteredDate FROM CaseMaster WHERE ${scopeFilter} AND CrimeRegisteredDate >= '${toDbDate(since)}'`,
    "CaseMaster"
  );

  const counts = new Map();
  for (const c of cases) {
    const key = new Date(c.CrimeRegisteredDate).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}
