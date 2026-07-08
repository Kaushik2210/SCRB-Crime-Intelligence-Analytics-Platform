import { getSession } from "@/lib/session";
import { getCaseScopeFilter } from "@/lib/scope";
import { getRiskTiles, getAnomalyAlerts } from "@/lib/risk";
import { getCategoryTreemap } from "@/lib/analytics";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskTilesView } from "@/components/risk/RiskTilesView";
import { CategoryTreemap } from "@/components/charts/CategoryTreemap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default async function RiskPage() {
  const session = await getSession();
  const user = session.user;
  const scopeFilter = getCaseScopeFilter(user);

  const [tiles, anomalies, treemap] = await Promise.all([
    getRiskTiles(scopeFilter),
    getAnomalyAlerts(scopeFilter),
    getCategoryTreemap(scopeFilter),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Predictive Risk & Anomaly View"
        description="Calm, gradient-based risk scoring by station and crime category, with plain-language anomaly callouts."
      />

      {anomalies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <Lightbulb className="size-4 text-accent-foreground/70" />
              Anomaly callouts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {anomalies.slice(0, 8).map((a) => (
              <p key={`${a.unitId}-${a.crimeSubHeadName}`} className="rounded-md bg-secondary/60 p-3 text-sm leading-relaxed text-foreground">
                {a.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Crime category breakdown, last 90 days</CardTitle>
          <p className="text-xs text-muted-foreground">Sized by case volume, grouped by crime head → sub-category.</p>
        </CardHeader>
        <CardContent>
          <CategoryTreemap data={treemap} />
        </CardContent>
      </Card>

      <RiskTilesView tiles={tiles} />
    </div>
  );
}
