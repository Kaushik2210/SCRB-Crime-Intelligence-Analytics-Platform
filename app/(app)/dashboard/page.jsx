import { getSession } from "@/lib/session";
import { getDashboardSummary } from "@/lib/dashboard";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { DashboardMap } from "@/components/map/DashboardMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Flame, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  const user = session.user;
  const summary = await getDashboardSummary(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.isStateLevel ? "Statewide Command Dashboard" : `${user.districtName} District Dashboard`}
        description={
          user.isStateLevel
            ? "Aggregated cross-district intelligence for the SCRB analyst view."
            : "Cases, hotspots, and alerts scoped to your jurisdiction."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total cases in scope" value={summary.totalCases} icon={FileText} />
        <KpiCard
          label="Cases, last 90 days"
          value={summary.recentCases}
          hint={`${summary.trendPct >= 0 ? "+" : ""}${summary.trendPct}% vs. prior 90 days`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Active hotspots"
          value={summary.hotspotCount}
          hint="Elevated-risk locality/category pairs"
          icon={Flame}
        />
        <KpiCard label="Trend anomalies" value={summary.anomalyCount} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              {user.isStateLevel ? "Statewide case density by district" : `${user.districtName} station map`}
            </CardTitle>
            {user.isStateLevel ? (
              <p className="text-xs text-muted-foreground">Click a district to drill down.</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <DashboardMap
              points={summary.mapPoints}
              initialLat={summary.mapCenter.lat}
              initialLng={summary.mapCenter.lng}
              initialZoom={summary.mapCenter.zoom}
              navigateToDistrict={user.isStateLevel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Strategic summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{summary.strategicSummary}</p>
            <div className="flex flex-col gap-2 text-sm">
              {!user.isStateLevel && user.districtId != null ? (
                <Link href={`/districts/${user.districtId}`} className="font-medium text-primary hover:underline">
                  Open district drill-down →
                </Link>
              ) : null}
              <Link href="/risk" className="font-medium text-primary hover:underline">
                Review predictive risk →
              </Link>
              <Link href="/alerts" className="font-medium text-primary hover:underline">
                View trend alerts →
              </Link>
              <Link href="/network" className="font-medium text-primary hover:underline">
                Explore network analysis →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
