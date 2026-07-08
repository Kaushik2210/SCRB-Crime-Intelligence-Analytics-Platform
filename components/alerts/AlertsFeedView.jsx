"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Badge } from "@/components/ui/badge";

export function AlertsFeedView({ items }) {
  const districts = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.districtName && set.add(i.districtName));
    return Array.from(set).sort();
  }, [items]);

  const [districtFilter, setDistrictFilter] = useState("all");
  const filtered = districtFilter === "all" ? items : items.filter((i) => i.districtName === districtFilter);

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No trend alerts or case updates in your current scope yet.
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

      <ol className="flex flex-col gap-3">
        {filtered.slice(0, 60).map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
            <div className="mt-0.5">
              {item.type === "anomaly" ? (
                <SeverityBadge tier={item.tier} />
              ) : (
                <Badge variant="secondary">Case Update</Badge>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{item.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.districtName ?? "Statewide"}
                {item.type === "chargesheet" ? ` · ${formatDistanceToNow(item.date, { addSuffix: true })}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
