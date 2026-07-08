import { prisma } from "@/lib/db";
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

  const [anomalies, chargesheets, actions] = await Promise.all([
    getAnomalyAlerts(scopeFilter),
    prisma.chargesheetDetails.findMany({
      where: { CaseMaster: scopeFilter },
      orderBy: { ReportDate: "desc" },
      take: 40,
      include: {
        CaseMaster: {
          select: {
            CrimeNo: true,
            PoliceStation: { select: { UnitName: true, District: { select: { DistrictName: true } } } },
          },
        },
      },
    }),
    prisma.alertAction.findMany({ where: { UserID: session.employeeId } }),
  ]);

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

  const chargesheetItems = chargesheets.map((c) => ({
    id: `chargesheet:${c.ChargesheetID}`,
    type: "chargesheet",
    tier: 1,
    districtName: c.CaseMaster.PoliceStation.District?.DistrictName ?? null,
    unitName: c.CaseMaster.PoliceStation.UnitName,
    message: `Case ${c.CaseMaster.CrimeNo} at ${c.CaseMaster.PoliceStation.UnitName} was marked "${c.ReportType}".`,
    date: c.ReportDate,
  }));

  return [...anomalyItems, ...chargesheetItems]
    .map((item) => ({ ...item, status: statusByKey.get(item.id) ?? null }))
    .filter((item) => item.status !== "DISMISSED")
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "anomaly" ? -1 : 1;
      return b.date.getTime() - a.date.getTime();
    });
}

const VALID_STATUSES = new Set(["INVESTIGATING", "DISMISSED"]);

/** Sets (or clears, via status=null) the calling user's status on an alert. */
export async function setAlertStatus(session, alertKey, status) {
  if (status === null) {
    await prisma.alertAction.deleteMany({ where: { UserID: session.employeeId, AlertKey: alertKey } });
    return { alertKey, status: null };
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid alert status: ${status}`);
  }

  await prisma.alertAction.upsert({
    where: { UserID_AlertKey: { UserID: session.employeeId, AlertKey: alertKey } },
    update: { Status: status },
    create: { UserID: session.employeeId, AlertKey: alertKey, Status: status },
  });
  return { alertKey, status };
}
