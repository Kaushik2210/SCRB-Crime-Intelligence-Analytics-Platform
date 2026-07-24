import { zcqlQuery } from "@/lib/zcql";
import { getCaseScopeFilter } from "@/lib/scope";
import { maskVictim, logUnmaskedVictimAccess } from "@/lib/masking";
import { getCrimeSubHeads } from "@/lib/lookups";

/**
 * Builds the network/link-analysis graph, centered on repeat offenders. There
 * is no global "person" master in this schema — Accused rows are case-scoped —
 * so a repeat offender is identified by matching name+gender across distinct
 * cases (documented simplification for the demo dataset, called out here so
 * it isn't mistaken for a real entity-resolution pipeline).
 */
export async function getNetworkGraph(session, maxOffenders = 30) {
  const scopeFilter = getCaseScopeFilter(session);

  const [accusedRows, cases, subHeads] = await Promise.all([
    zcqlQuery(
      `SELECT ROWID AS AccusedMasterID, Name, Gender, CaseMasterID FROM Accused
       WHERE CaseMasterID IN (SELECT ROWID FROM CaseMaster WHERE ${scopeFilter})`,
      "Accused"
    ),
    zcqlQuery(
      `SELECT ROWID AS CaseMasterID, CrimeNo, CrimeMinorHeadID FROM CaseMaster WHERE ${scopeFilter}`,
      "CaseMaster"
    ),
    getCrimeSubHeads(),
  ]);

  const caseById = new Map(cases.map((c) => [c.CaseMasterID, c]));
  const subHeadNameById = new Map(subHeads.map((s) => [s.CrimeSubHeadID, s.CrimeSubHeadName]));

  const identityKey = (name, gender) => `${name.trim().toLowerCase()}::${gender}`;

  const identities = new Map();
  for (const row of accusedRows) {
    const caseRow = caseById.get(row.CaseMasterID);
    if (!caseRow) continue;
    const key = identityKey(row.Name, row.Gender);
    const entry = identities.get(key) ?? { name: row.Name, caseIds: new Set(), crimeNos: new Map(), subHeads: new Set() };
    entry.caseIds.add(row.CaseMasterID);
    entry.crimeNos.set(row.CaseMasterID, caseRow.CrimeNo);
    entry.subHeads.add(subHeadNameById.get(caseRow.CrimeMinorHeadID) ?? "Unknown");
    identities.set(key, entry);
  }

  const repeatOffenders = Array.from(identities.entries())
    .filter(([, v]) => v.caseIds.size >= 2)
    .sort((a, b) => b[1].caseIds.size - a[1].caseIds.size)
    .slice(0, maxOffenders);

  const nodes = [];
  const links = [];
  const includedCaseIds = new Set();

  // Reverse index (caseId -> offender keys) so we can detect co-accused pairs
  // — two repeat offenders named in the same case are "known associates".
  const caseIdToOffenderKeys = new Map();
  for (const [key, offender] of repeatOffenders) {
    for (const caseId of offender.caseIds) {
      const list = caseIdToOffenderKeys.get(caseId) ?? [];
      list.push(key);
      caseIdToOffenderKeys.set(caseId, list);
    }
  }

  const associatePairWeight = new Map(); // "keyA||keyB" (sorted) -> shared case count
  for (const keys of caseIdToOffenderKeys.values()) {
    if (keys.length < 2) continue;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const pairKey = [keys[i], keys[j]].sort().join("||");
        associatePairWeight.set(pairKey, (associatePairWeight.get(pairKey) ?? 0) + 1);
      }
    }
  }

  const nameByKey = new Map(repeatOffenders.map(([key, o]) => [key, o.name]));

  for (const [key, offender] of repeatOffenders) {
    const offenderNodeId = `accused:${key}`;
    const associates = Array.from(associatePairWeight.entries())
      .filter(([pairKey]) => pairKey.split("||").includes(key))
      .map(([pairKey, weight]) => {
        const otherKey = pairKey.split("||").find((k) => k !== key);
        return { name: nameByKey.get(otherKey), sharedCases: weight };
      })
      .sort((a, b) => b.sharedCases - a.sharedCases);

    nodes.push({
      id: offenderNodeId,
      type: "accused",
      label: offender.name,
      caseCount: offender.caseIds.size,
      isRepeatOffender: true,
      modusOperandi: Array.from(offender.subHeads),
      associates,
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

  // Direct associate_of edges between co-accused offenders, weighted by the
  // number of cases they share — drives "connection strength" in the UI.
  for (const [pairKey, weight] of associatePairWeight.entries()) {
    const [keyA, keyB] = pairKey.split("||");
    links.push({ source: `accused:${keyA}`, target: `accused:${keyB}`, type: "associate_of", weight });
  }

  // Attach victims (masked per clearance) for every included case.
  if (includedCaseIds.size > 0) {
    const victims = await zcqlQuery(
      `SELECT ROWID AS VictimMasterID, VictimName, CaseMasterID FROM Victim
       WHERE CaseMasterID IN (${Array.from(includedCaseIds).join(",")})`,
      "Victim"
    );
    const maskedVictimIds = [];
    for (const v of victims) {
      // Only attach victims whose case is actually a node in this graph. The
      // query already filters by includedCaseIds, but guard here too so a link
      // can never point at a missing `case:*` node (react-force-graph throws
      // "node not found" on a dangling link) — e.g. if the data source returns
      // extra rows.
      if (!includedCaseIds.has(v.CaseMasterID)) continue;
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
