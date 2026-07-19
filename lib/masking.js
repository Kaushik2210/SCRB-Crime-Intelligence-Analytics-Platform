import { getTable } from "@/lib/zcql";

/**
 * Victim identity is protected by default (see data-sensitivity rules in the
 * project brief): unless the session carries explicit `victimClearance`,
 * VictimName is replaced with a stable "Victim #{id}" label. This must run at
 * the API serialization boundary — never rely on the client to hide the name.
 */
export function maskVictim(victim, session) {
  if (session.victimClearance) return victim;
  return { ...victim, VictimName: `Victim #${victim.VictimMasterID}` };
}

export function maskVictims(victims, session) {
  return victims.map((v) => maskVictim(v, session));
}

/**
 * Writes an audit-trail row whenever a cleared user is served unmasked victim
 * data. Call this once per request (not per record) right after a route
 * decides it will return unmasked victim fields.
 */
export async function logUnmaskedVictimAccess(session, victimIds) {
  if (!session.victimClearance || victimIds.length === 0) return;
  const table = getTable("AccessLog");
  await table.insertRows(
    victimIds.map((recordId) => ({
      UserID: session.employeeId,
      Entity: "Victim",
      RecordID: recordId,
      Action: "VIEW_UNMASKED",
      CreatedAt: new Date().toISOString(),
    }))
  );
}
