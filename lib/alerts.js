import { zcqlQuery, getTable } from "@/lib/zcql";
import { getCaseScopeFilter } from "@/lib/scope";
import { getAnomalyAlerts } from "@/lib/risk";

function anomalyTier(ratio) {
  if (ratio >= 3) return 5;
  if (ratio >= 2.5) return 4;
  return 3;
}

/**
 * Alerts (anomalies, chargesheet events) are computed on read — there's no
 * "alerts" table — so per-user dismiss/investigate state lives in
 * `AlertAction`, keyed by the same stable id string used for the feed item.
 * Dismissed items are dropped from the feed; everything else carries its
 * current `status` ("INVESTIGATING" or null) for the UI to render.
 */
export async function getAlertsFeed(session) {
  const scopeFilter = getCaseScopeFilter(session);

  const [anomalies, chargesheetRows, units, districts, actions] = await Promise.all([
    getAnomalyAlerts(scopeFilter),
    zcqlQuery(
      `SELECT ROWID AS ChargesheetID, CaseMasterID, ReportType, ReportDate
       FROM ChargesheetDetails
       WHERE CaseMasterID IN (SELECT ROWID FROM CaseMaster WHERE ${scopeFilter})
       ORDER BY ReportDate DESC
       LIMIT 40`,
      "ChargesheetDetails"
    ),
    zcqlQuery(`SELECT ROWID AS UnitID, UnitName, DistrictID FROM Unit`, "Unit"),
    zcqlQuery(`SELECT ROWID AS DistrictID, DistrictName FROM District`, "District"),
    zcqlQuery(
      `SELECT ROWID AS AlertActionID, AlertKey, Status FROM AlertAction WHERE UserID = ${session.employeeId}`,
      "AlertAction"
    ),
  ]);

  // Chargesheet rows only carry CaseMasterID — pull the matching CaseMaster
  // rows (crime number + station) in one follow-up query rather than a join.
  const caseIds = chargesheetRows.map((c) => c.CaseMasterID);
  const cases = caseIds.length
    ? await zcqlQuery(
        `SELECT ROWID AS CaseMasterID, CrimeNo, PoliceStationID FROM CaseMaster WHERE ROWID IN (${caseIds.join(",")})`,
        "CaseMaster"
      )
    : [];
  const caseById = new Map(cases.map((c) => [c.CaseMasterID, c]));
  const unitById = new Map(units.map((u) => [u.UnitID, u]));
  const districtNameById = new Map(districts.map((d) => [d.DistrictID, d.DistrictName]));

  const statusByKey = new Map(actions.map((a) => [a.AlertKey, a.Status]));

  const anomalyItems = anomalies.map((a) => ({
    id: `anomaly:${a.unitId}:${a.crimeSubHeadName}`,
    type: "anomaly",
    tier: anomalyTier(a.ratio),
    districtName: a.districtName,
    unitName: a.unitName,
    message: a.message,
    date: new Date(),
  }));

  const chargesheetItems = chargesheetRows
    .map((c) => {
      const caseRow = caseById.get(c.CaseMasterID);
      const unit = caseRow ? unitById.get(caseRow.PoliceStationID) : null;
      if (!caseRow || !unit) return null;
      return {
        id: `chargesheet:${c.ChargesheetID}`,
        type: "chargesheet",
        tier: 1,
        districtName: unit.DistrictID != null ? districtNameById.get(unit.DistrictID) ?? null : null,
        unitName: unit.UnitName,
        message: `Case ${caseRow.CrimeNo} at ${unit.UnitName} was marked "${c.ReportType}".`,
        date: new Date(c.ReportDate),
      };
    })
    .filter(Boolean);

  return [...anomalyItems, ...chargesheetItems]
    .map((item) => ({ ...item, status: statusByKey.get(item.id) ?? null }))
    .filter((item) => item.status !== "DISMISSED")
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "anomaly" ? -1 : 1;
      return b.date.getTime() - a.date.getTime();
    });
}

const VALID_STATUSES = new Set(["INVESTIGATING", "DISMISSED"]);

/**
 * Sets (or clears, via status=null) the calling user's status on an alert.
 * Data Store has no composite-unique constraint (see the Catalyst schema
 * doc), so this does a manual check-then-write instead of an upsert.
 */
export async function setAlertStatus(session, alertKey, status) {
  const table = getTable("AlertAction");
  const existingRows = await zcqlQuery(
    `SELECT ROWID AS AlertActionID FROM AlertAction WHERE UserID = ${session.employeeId} AND AlertKey = '${escapeSql(alertKey)}'`,
    "AlertAction"
  );
  const existing = existingRows[0];

  if (status === null) {
    if (existing) await table.deleteRow(existing.AlertActionID);
    return { alertKey, status: null };
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid alert status: ${status}`);
  }

  if (existing) {
    await table.updateRow({ ROWID: existing.AlertActionID, Status: status });
  } else {
    await table.insertRow({
      UserID: session.employeeId,
      AlertKey: alertKey,
      Status: status,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    });
  }
  return { alertKey, status };
}

/** AlertKey is server-generated (unit id + category name), but escape defensively before string interpolation. */
function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}
