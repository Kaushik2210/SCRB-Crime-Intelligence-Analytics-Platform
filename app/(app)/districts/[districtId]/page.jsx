import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { resolveAllowedDistrictId } from "@/lib/scope";
import { getDistrictDrilldown } from "@/lib/district";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { HotspotTimeRange } from "@/components/district/HotspotTimeRange";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Flame, TrendingUp, ShieldOff } from "lucide-react";

// See app/(app)/dashboard/page.jsx for why mapbox-gl is dynamically imported
// with ssr:false instead of a static import.
const CaseMap = dynamic(() => import("@/components/map/CaseMap").then((m) => m.CaseMap), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-lg bg-muted" />,
});

export default async function DistrictPage({ params }) {
  const { districtId: districtIdParam } = await params;
  const districtId = Number(districtIdParam);
  const session = await getSession();
  const user = session.user;

  const allowedId = resolveAllowedDistrictId(user, districtId);
  if (allowedId == null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
        <ShieldOff className="size-8 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">
          This district is outside your jurisdiction. Your access is scoped to {user.districtName ?? "your assigned district"}.
        </p>
      </div>
    );
  }

  const data = await getDistrictDrilldown(allowedId);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${data.districtName} District Drill-Down`}
        description="Station-level hotspot mapping, baseline comparison, and aggregate demographic context."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Cases, last 90 days" value={data.recentCaseCount} icon={FileText} />
        <KpiCard
          label="vs. statewide district average"
          value={`${data.comparisonPct >= 0 ? "+" : ""}${data.comparisonPct}%`}
          hint={`Typical district: ~${data.baselineAvgPerDistrict} cases / 90 days`}
          icon={TrendingUp}
        />
        <KpiCard label="Detected hotspot clusters" value={data.hotspots.length} icon={Flame} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-base">Station map &amp; spatial hotspots</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CaseMap points={data.stationPoints} initialLat={data.center.lat} initialLng={data.center.lng} initialZoom={9.5} />
            <HotspotTimeRange districtId={data.districtId} initialHotspots={data.hotspots} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Aggregate demographic context</CardTitle>
            <p className="text-xs text-muted-foreground">
              Statistical summaries only — never individual-level records or filters.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.demographics.highlights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough case data yet to summarize.</p>
            ) : (
              data.demographics.highlights.map((h, i) => (
                <p key={i} className="rounded-md bg-secondary/60 p-3 text-sm leading-relaxed text-foreground">
                  {h}
                </p>
              ))
            )}
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">By occupation</p>
              <ul className="flex flex-col gap-1 text-sm">
                {data.demographics.byOccupation.slice(0, 4).map((d) => (
                  <li key={d.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{d.percentage}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
