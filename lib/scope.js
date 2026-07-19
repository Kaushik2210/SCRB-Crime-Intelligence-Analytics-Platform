/**
 * A ZCQL `WHERE` fragment (string) for CaseMaster queries that enforces
 * jurisdiction scoping server-side. SCRB analysts (state-level) get an
 * unrestricted `1=1`; every other role is pinned to their own district via a
 * subquery against Unit. Callers must always splice this into their query's
 * WHERE clause — never trust a client-supplied districtId/unitId instead.
 *
 * `session.districtId` only ever originates from the authenticated session
 * (never raw request input), but is still hard-validated as an integer here
 * before string interpolation, as defense in depth against injection.
 */
export function getCaseScopeFilter(session) {
  if (session.isStateLevel) return "1=1";
  if (session.districtId == null) {
    // No district on file and not state-level: fail closed to zero results
    // rather than accidentally leaking statewide data.
    return "1=0";
  }
  assertInteger(session.districtId, "session.districtId");
  return `PoliceStationID IN (SELECT ROWID FROM Unit WHERE DistrictID = ${session.districtId})`;
}

/** Same scoping rule, expressed for tables that carry DistrictID directly. */
export function getDistrictScopeFilter(session) {
  if (session.isStateLevel) return "1=1";
  if (session.districtId == null) return "1=0";
  assertInteger(session.districtId, "session.districtId");
  return `DistrictID = ${session.districtId}`;
}

/**
 * Throws-free guard for a specific requested districtId (e.g. the
 * /districts/[districtId] route): returns the districtId an officer is
 * allowed to see, or null if the request is out of scope.
 */
export function resolveAllowedDistrictId(session, requestedDistrictId) {
  if (session.isStateLevel) return requestedDistrictId;
  if (session.districtId === requestedDistrictId) return requestedDistrictId;
  return null;
}

function assertInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer, got: ${JSON.stringify(value)}`);
  }
}
