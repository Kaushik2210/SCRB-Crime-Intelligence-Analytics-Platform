"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Network,
  TrendingUp,
  Bell,
  MapPin,
  Search,
  FileText,
  UserRound,
  Loader2,
  Table2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "home overview summary" },
  { href: "/network", label: "Network Analysis", icon: Network, keywords: "offenders graph links accused" },
  { href: "/risk", label: "Predictive Risk", icon: TrendingUp, keywords: "hotspots score anomaly" },
  { href: "/alerts", label: "Alerts & Trends", icon: Bell, keywords: "notifications feed updates" },
  { href: "/cases", label: "Case Records", icon: Table2, keywords: "table list search cases" },
];

/** Debounced cross-entity search (cases + officers), scoped server-side via lib/search.js. */
function useRemoteSearch(query) {
  const [remote, setRemote] = useState({ cases: [], officers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote({ cases: [], officers: [] });
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { cases: [], officers: [] }))
        .then(setRemote)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setLoading(false);
    };
  }, [query]);

  return { remote, loading };
}

/**
 * Lightweight command palette built on the existing Dialog primitive (no new
 * dependency). Ctrl/Cmd+K opens it from anywhere in the authenticated app;
 * filters the 4 nav routes plus districts, cases, and officers.
 */
export function CommandPalette({ open, onOpenChange, districts = [] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { remote, loading } = useRemoteSearch(query);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navMatches = NAV_ITEMS.filter(
      (item) => !q || item.label.toLowerCase().includes(q) || item.keywords.includes(q)
    ).map((item) => ({ type: "nav", href: item.href, label: item.label, icon: item.icon }));

    const districtMatches = q
      ? districts
          .filter((d) => d.name.toLowerCase().includes(q))
          .slice(0, 8)
          .map((d) => ({ type: "district", href: `/districts/${d.id}`, label: d.name, icon: MapPin }))
      : [];

    const caseMatches = remote.cases.map((c) => ({
      type: "case",
      href: c.districtId ? `/districts/${c.districtId}` : undefined,
      label: `${c.crimeNo} · ${c.subHeadName}`,
      sublabel: c.unitName,
      icon: FileText,
    }));

    const officerMatches = remote.officers.map((o) => ({
      type: "officer",
      href: undefined, // no employee-detail route yet; shown for context, not navigable
      label: `${o.name} · ${o.kgid}`,
      sublabel: o.designationName,
      icon: UserRound,
      disabled: true,
    }));

    return [...navMatches, ...districtMatches, ...caseMatches, ...officerMatches];
  }, [query, districts, remote]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  function go(item) {
    if (!item?.href || item.disabled) return;
    router.push(item.href);
    onOpenChange(false);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  const TYPE_TAGS = { district: "District", case: "Case", officer: "Officer" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, districts, cases, officers…"
            className="h-11 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          />
          {loading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
              Esc
            </kbd>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;</p>
          ) : (
            results.map((item, i) => (
              <button
                key={`${item.type}-${item.label}`}
                type="button"
                disabled={item.disabled}
                onClick={() => go(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  item.disabled && "cursor-default opacity-70",
                  !item.disabled && i === activeIndex
                    ? "bg-accent/15 text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex flex-1 flex-col truncate">
                  <span className="truncate">{item.label}</span>
                  {item.sublabel ? (
                    <span className="truncate text-xs text-muted-foreground/70">{item.sublabel}</span>
                  ) : null}
                </span>
                {TYPE_TAGS[item.type] ? (
                  <span className="text-xs text-muted-foreground/70">{TYPE_TAGS[item.type]}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
