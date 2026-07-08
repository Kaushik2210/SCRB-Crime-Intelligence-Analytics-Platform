"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
  { label: "All time", days: null },
];

/**
 * Client-side time-range control for the district hotspot list. Refetches
 * `/api/districts/[id]/hotspots` (real PostGIS ST_ClusterDBSCAN, or the JS
 * fallback — see lib/geo.js) whenever the window changes, so the map's
 * hotspot markers reflect a genuinely different query, not just a client
 * filter over a fixed payload.
 */
export function HotspotTimeRange({ districtId, initialHotspots }) {
  const [activeDays, setActiveDays] = useState(null);
  const [hotspots, setHotspots] = useState(initialHotspots);
  const [isPending, startTransition] = useTransition();

  function selectRange(days) {
    setActiveDays(days);
    startTransition(async () => {
      const qs = days ? `?days=${days}` : "";
      const res = await fetch(`/api/districts/${districtId}/hotspots${qs}`);
      if (res.ok) {
        const data = await res.json();
        setHotspots(data.hotspots);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => selectRange(r.days)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              activeDays === r.days
                ? "border-accent/40 bg-accent/15 text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            )}
          >
            {r.label}
          </button>
        ))}
        {isPending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {hotspots.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No spatial clusters detected for this window — hotspot detection needs the PostGIS
          geography column populated via <code className="font-mono">npm run db:geo-setup</code>, or
          simply not enough cases in range.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {hotspots.slice(0, 6).map((h) => (
            <li key={h.clusterId}>
              Cluster of {h.caseCount} cases near {h.lat.toFixed(3)}, {h.lng.toFixed(3)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
