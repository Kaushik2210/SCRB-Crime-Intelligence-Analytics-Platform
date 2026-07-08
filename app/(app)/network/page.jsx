import { getSession } from "@/lib/session";
import { getNetworkGraph } from "@/lib/network";
import { PageHeader } from "@/components/shared/PageHeader";
import { AccessTierBadge } from "@/components/shared/AccessTierBadge";
import { KpiCard } from "@/components/shared/KpiCard";
import { NetworkGraphView } from "@/components/network/NetworkGraphView";
import { Users, FileText } from "lucide-react";

export default async function NetworkPage() {
  const session = await getSession();
  const user = session.user;
  const graph = await getNetworkGraph(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Network & Link Analysis"
        description="Repeat offenders and shared modus operandi surfaced across cases, victims, and arrest records."
        actions={<AccessTierBadge unmasked={user.victimClearance} />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="Repeat offenders identified" value={graph.repeatOffenderCount} icon={Users} />
        <KpiCard label="Cases in this network" value={graph.caseCount} icon={FileText} />
      </div>

      <NetworkGraphView graph={graph} />
    </div>
  );
}
