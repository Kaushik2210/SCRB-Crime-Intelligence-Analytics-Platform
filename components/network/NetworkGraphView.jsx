"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_COLOR_VAR = {
  accused: "--chart-4",
  case: "--chart-2",
  victim: "--chart-1",
};

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
          nodeColor={(n) => colors[n.type ?? "case"] ?? "#888888"}
          linkColor={() => colors.border ?? "#cccccc"}
          onNodeClick={(n) => setSelected(n)}
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
          {selected ? (
            <div className="flex flex-col gap-2 rounded-md bg-secondary/60 p-3">
              <p className="font-medium text-foreground">{selected.label}</p>
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
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Click a node to inspect its details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
