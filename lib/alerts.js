import { prisma } from "@/lib/db";
import { getCaseScopeFilter } from "@/lib/scope";
import { getAnomalyAlerts } from "@/lib/risk";

function anomalyTier(ratio) {
  if (ratio >= 3) return 5;
  if (ratio >= 2.5) return 4;
  return 3;
}

export async function getAlertsFeed(session) {
  const scopeFilter = getCaseScopeFilter(session);

  const [anomalies, chargesheets] = await Promise.all([
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
  ]);

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

  return [...anomalyItems, ...chargesheetItems].sort((a, b) => {
    if (a.type !== b.type) return a.type === "anomaly" ? -1 : 1;
    return b.date.getTime() - a.date.getTime();
  });
}
