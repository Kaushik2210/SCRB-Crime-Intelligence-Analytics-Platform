"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, stable: Minus };
const TREND_LABEL = { rising: "Forecast rising", falling: "Forecast easing", stable: "Forecast stable" };

export function RiskTilesView({ tiles }) {
  const districts = useMemo(() => {
    const set = new Set();
    tiles.forEach((t) => t.districtName && set.add(t.districtName));
    return Array.from(set).sort();
  }, [tiles]);

  const [districtFilter, setDistrictFilter] = useState("all");

  const filtered = districtFilter === "all" ? tiles : tiles.filter((t) => t.districtName === districtFilter);

  if (tiles.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Not enough recent case history to compute risk scores yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {districts.length > 1 ? (
        <Select value={districtFilter} onValueChange={(value) => setDistrictFilter(value ?? "all")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by district" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 24).map((tile) => (
          <Card key={`${tile.unitId}-${tile.crimeSubHeadId}`} className="gap-2">
            <CardContent className="flex flex-col gap-2 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{tile.crimeSubHeadName}</p>
                  <p className="text-xs text-muted-foreground">{tile.unitName}</p>
                </div>
                <SeverityBadge tier={tile.tier} />
              </div>
              <p className="text-xs text-muted-foreground">
                {tile.recentCount} cases in the last 90 days · typical {tile.baselineAvgPer90}
              </p>
              {tile.trendDirection ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {(() => {
                    const Icon = TREND_ICON[tile.trendDirection];
                    return <Icon className="size-3.5 shrink-0" />;
                  })()}
                  {TREND_LABEL[tile.trendDirection]} — ~{tile.predictedNextCount} projected next quarter
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
