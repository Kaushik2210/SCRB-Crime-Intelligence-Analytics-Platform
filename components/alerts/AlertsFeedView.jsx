"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, X } from "lucide-react";

async function postAlertAction(alertKey, status) {
  const res = await fetch("/api/alerts/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertKey, status }),
  });
  if (!res.ok) throw new Error("Failed to update alert");
}

export function AlertsFeedView({ items: initialItems }) {
  const [items, setItems] = useState(initialItems);

  const districts = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.districtName && set.add(i.districtName));
    return Array.from(set).sort();
  }, [items]);

  const [districtFilter, setDistrictFilter] = useState("all");
  const filtered = districtFilter === "all" ? items : items.filter((i) => i.districtName === districtFilter);

  function updateStatus(item, status) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    postAlertAction(item.id, status).catch(() => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
      toast.error("Couldn't update that alert. Try again.");
    });
  }

  function dismiss(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    postAlertAction(item.id, "DISMISSED").catch(() => {
      setItems((prev) => [...prev, item]);
      toast.error("Couldn't dismiss that alert. Try again.");
    });
    toast("Alert dismissed", {
      action: {
        label: "Undo",
        onClick: () => {
          setItems((prev) => [...prev, item]);
          postAlertAction(item.id, null).catch(() => {});
        },
      },
    });
  }

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
                {item.status === "INVESTIGATING" ? " · Investigating" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant={item.status === "INVESTIGATING" ? "secondary" : "ghost"}
                size="icon-sm"
                title={item.status === "INVESTIGATING" ? "Stop investigating" : "Mark as investigating"}
                onClick={() => updateStatus(item, item.status === "INVESTIGATING" ? null : "INVESTIGATING")}
              >
                {item.status === "INVESTIGATING" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button variant="ghost" size="icon-sm" title="Dismiss" onClick={() => dismiss(item)}>
                <X className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
