"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_COLOR_VAR = {
  accused: "--chart-4",
  case: "--chart-2",
  victim: "--chart-1",
};

/** Appends an alpha suffix to a #rrggbb color for the "dimmed" (unfocused) state. */
function withAlpha(hex, alpha) {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alpha}`;
}

/**
 * Canvas fillStyle can't resolve `var(--x)` — only real DOM elements can.
 * react-force-graph-2d draws on a <canvas>, so node/link colors must be
 * resolved to literal values via getComputedStyle before use.
 */
function useResolvedColors() {
  const [colors, setColors] = useState({});
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const resolve = (name) => styles.getPropertyValue(name).trim() || "#888888";
    setColors({
      accused: resolve(NODE_COLOR_VAR.accused),
      case: resolve(NODE_COLOR_VAR.case),
      victim: resolve(NODE_COLOR_VAR.victim),
      border: resolve("--border"),
      accent: resolve("--accent"),
    });
  }, []);
  return colors;
}

export function NetworkGraphView({ graph }) {
  const [selected, setSelected] = useState(null);
  const colors = useResolvedColors();

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n, val: n.type === "accused" ? 4 + (n.caseCount ?? 1) : 2 })),
      links: graph.links.map((l) => ({ ...l })),
    }),
    [graph]
  );

  // 1-hop focus set: when a node is selected, everything directly connected
  // to it stays at full opacity and everything else dims — a lightweight,
  // dependency-free stand-in for "expandable" node interaction.
  const focusIds = useMemo(() => {
    if (!selected) return null;
    const ids = new Set([selected.id]);
    for (const link of data.links) {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;
      if (sourceId === selected.id) ids.add(targetId);
      if (targetId === selected.id) ids.add(sourceId);
    }
    return ids;
  }, [selected, data.links]);

  function isDimmed(id) {
    return focusIds ? !focusIds.has(id) : false;
  }

  function findNodeByLabel(label) {
    return data.nodes.find((n) => n.type === "accused" && n.label === label);
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No repeat-offender patterns detected in your current scope yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="overflow-hidden rounded-lg border border-border lg:col-span-2" style={{ height: 480 }}>
        <ForceGraph2D
          graphData={data}
          nodeId="id"
          nodeVal="val"
          nodeLabel={(n) => n.label ?? ""}
          nodeColor={(n) => {
            const base = colors[n.type ?? "case"] ?? "#888888";
            return isDimmed(n.id) ? withAlpha(base, "33") : base;
          }}
          linkColor={(l) => {
            const sourceId = typeof l.source === "object" ? l.source.id : l.source;
            const targetId = typeof l.target === "object" ? l.target.id : l.target;
            const dimmed = focusIds ? !(focusIds.has(sourceId) && focusIds.has(targetId)) : false;
            const base = l.type === "associate_of" ? colors.accent : colors.border;
            return dimmed ? withAlpha(base, "22") : base;
          }}
          linkWidth={(l) => (l.type === "associate_of" ? Math.min(1 + (l.weight ?? 1), 5) : 1)}
          linkLineDash={(l) => (l.type === "associate_of" ? [] : [2, 2])}
          onNodeClick={(n) => setSelected(n)}
          onBackgroundClick={() => setSelected(null)}
          width={undefined}
          height={480}
          cooldownTicks={80}
        />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 text-sm">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: `var(${NODE_COLOR_VAR.accused})` }} /> Accused
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: `var(${NODE_COLOR_VAR.case})` }} /> Case
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: `var(${NODE_COLOR_VAR.victim})` }} /> Victim
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-px w-4 bg-accent" /> Co-accused association (connection strength = shared cases)
          </p>
          {selected ? (
            <div className="flex flex-col gap-2 rounded-md bg-secondary/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{selected.label}</p>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear focus
                </button>
              </div>
              <p className="text-xs capitalize text-muted-foreground">{selected.type}</p>
              {selected.caseCount ? (
                <p className="text-xs text-muted-foreground">Linked to {selected.caseCount} cases</p>
              ) : null}
              {selected.modusOperandi && selected.modusOperandi.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Modus operandi
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selected.modusOperandi.map((mo) => (
                      <span key={mo} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-foreground/80">
                        {mo}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {selected.associates && selected.associates.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Known associates
                  </p>
                  <ul className="flex flex-col gap-1">
                    {selected.associates.map((a) => (
                      <li key={a.name} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const node = findNodeByLabel(a.name);
                            if (node) setSelected(node);
                          }}
                          className="text-left text-xs text-foreground hover:underline"
                        >
                          {a.name}
                        </button>
                        <Badge variant="secondary" className="text-[10px]">
                          {a.sharedCases} shared
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click a node to focus its connections and inspect details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
