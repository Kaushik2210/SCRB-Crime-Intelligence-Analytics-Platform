/**
 * A Prisma `where` fragment for CaseMaster (and anything joined through
 * PoliceStation/District) that enforces jurisdiction scoping server-side.
 * SCRB analysts (state-level) get an unrestricted `{}`; every other role is
 * pinned to their own district. Callers must always spread this into their
 * query — never trust a client-supplied districtId/unitId instead.
 */
export function getCaseScopeFilter(session) {
  if (session.isStateLevel) return {};
  if (session.districtId == null) {
    // No district on file and not state-level: fail closed to zero results
    // rather than accidentally leaking statewide data.
    return { PoliceStationID: -1 };
  }
  return { PoliceStation: { DistrictID: session.districtId } };
}

/** Same scoping rule, expressed for models that carry DistrictID directly. */
export function getDistrictScopeFilter(session) {
  if (session.isStateLevel) return {};
  if (session.districtId == null) return { DistrictID: -1 };
  return { DistrictID: session.districtId };
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
