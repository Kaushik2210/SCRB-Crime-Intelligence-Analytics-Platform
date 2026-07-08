import { prisma } from "@/lib/db";

/**
 * Two-level treemap data (CrimeHead -> CrimeSubHead) by recent case volume,
 * scoped to the caller's jurisdiction. Powers the Treemap on the Risk page.
 */
export async function getCategoryTreemap(scopeFilter, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const cases = await prisma.caseMaster.findMany({
    where: { ...scopeFilter, CrimeRegisteredDate: { gte: since } },
    select: {
      CrimeMajorHead: { select: { CrimeHeadName: true } },
      CrimeMinorHead: { select: { CrimeSubHeadName: true } },
    },
  });

  const headMap = new Map(); // headName -> Map(subHeadName -> count)
  for (const c of cases) {
    const headName = c.CrimeMajorHead.CrimeHeadName;
    const subName = c.CrimeMinorHead.CrimeSubHeadName;
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

  const cases = await prisma.caseMaster.findMany({
    where: { ...scopeFilter, CrimeRegisteredDate: { gte: since } },
    select: {
      CaseCategory: { select: { CategoryName: true } },
      CrimeMajorHead: { select: { CrimeHeadName: true } },
      CaseStatus: { select: { StatusName: true } },
    },
  });

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
    const category = `${c.CaseCategory.CategoryName}`;
    const head = c.CrimeMajorHead.CrimeHeadName;
    const status = c.CaseStatus.StatusName;
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

  const cases = await prisma.caseMaster.findMany({
    where: { ...scopeFilter, CrimeRegisteredDate: { gte: since } },
    select: { CrimeRegisteredDate: true },
  });

  const counts = new Map();
  for (const c of cases) {
    const key = c.CrimeRegisteredDate.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}
