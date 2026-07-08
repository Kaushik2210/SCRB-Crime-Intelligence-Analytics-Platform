import { prisma } from "@/lib/db";
import { getCaseScopeFilter } from "@/lib/scope";
import { maskVictim, logUnmaskedVictimAccess } from "@/lib/masking";

/**
 * Builds the network/link-analysis graph, centered on repeat offenders. There
 * is no global "person" master in this schema — Accused rows are case-scoped —
 * so a repeat offender is identified by matching name+gender across distinct
 * cases (documented simplification for the demo dataset, called out here so
 * it isn't mistaken for a real entity-resolution pipeline).
 */
export async function getNetworkGraph(session, maxOffenders = 30) {
  const scopeFilter = getCaseScopeFilter(session);

  const accusedRows = await prisma.accused.findMany({
    where: { CaseMaster: scopeFilter },
    select: {
      AccusedMasterID: true,
      Name: true,
      Gender: true,
      CaseMasterID: true,
      CaseMaster: {
        select: {
          CrimeNo: true,
          CrimeMinorHead: { select: { CrimeSubHeadName: true } },
        },
      },
    },
  });

  const identityKey = (name, gender) => `${name.trim().toLowerCase()}::${gender}`;

  const identities = new Map();
  for (const row of accusedRows) {
    const key = identityKey(row.Name, row.Gender);
    const entry = identities.get(key) ?? { name: row.Name, caseIds: new Set(), crimeNos: new Map(), subHeads: new Set() };
    entry.caseIds.add(row.CaseMasterID);
    entry.crimeNos.set(row.CaseMasterID, row.CaseMaster.CrimeNo);
    entry.subHeads.add(row.CaseMaster.CrimeMinorHead.CrimeSubHeadName);
    identities.set(key, entry);
  }

  const repeatOffenders = Array.from(identities.entries())
    .filter(([, v]) => v.caseIds.size >= 2)
    .sort((a, b) => b[1].caseIds.size - a[1].caseIds.size)
    .slice(0, maxOffenders);

  const nodes = [];
  const links = [];
  const includedCaseIds = new Set();

  for (const [key, offender] of repeatOffenders) {
    const offenderNodeId = `accused:${key}`;
    nodes.push({
      id: offenderNodeId,
      type: "accused",
      label: offender.name,
      caseCount: offender.caseIds.size,
      isRepeatOffender: true,
      modusOperandi: Array.from(offender.subHeads),
    });

    for (const caseId of offender.caseIds) {
      includedCaseIds.add(caseId);
      const caseNodeId = `case:${caseId}`;
      if (!nodes.find((n) => n.id === caseNodeId)) {
        nodes.push({ id: caseNodeId, type: "case", label: offender.crimeNos.get(caseId) ?? `Case ${caseId}`, crimeNo: offender.crimeNos.get(caseId) });
      }
      links.push({ source: offenderNodeId, target: caseNodeId, type: "accused_in" });
    }
  }

  // Attach victims (masked per clearance) for every included case.
  if (includedCaseIds.size > 0) {
    const victims = await prisma.victim.findMany({
      where: { CaseMasterID: { in: Array.from(includedCaseIds) } },
      select: { VictimMasterID: true, VictimName: true, CaseMasterID: true },
    });
    const maskedVictimIds = [];
    for (const v of victims) {
      const masked = maskVictim(v, session);
      if (session.victimClearance) maskedVictimIds.push(v.VictimMasterID);

      const victimNodeId = `victim:${v.VictimMasterID}`;
      nodes.push({ id: victimNodeId, type: "victim", label: masked.VictimName });
      links.push({ source: victimNodeId, target: `case:${v.CaseMasterID}`, type: "victim_in" });
    }
    await logUnmaskedVictimAccess(session, maskedVictimIds);
  }

  return {
    nodes,
    links,
    repeatOffenderCount: repeatOffenders.length,
    caseCount: includedCaseIds.size,
  };
}
