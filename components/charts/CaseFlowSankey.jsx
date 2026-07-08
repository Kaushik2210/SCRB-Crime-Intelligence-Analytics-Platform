"use client";

import { Sankey, ResponsiveContainer, Tooltip, Layer, Rectangle } from "recharts";
import { useCssVars } from "@/hooks/useCssVars";

const COLOR_VARS = ["--chart-2", "--chart-3", "--chart-4"];

function CustomNode({ x, y, width, height, index, payload, colors }) {
  const fill = colors[COLOR_VARS[index % COLOR_VARS.length]] ?? "#888";
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} />
      <text
        x={x + width + 6}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={11}
        fill={colors["--foreground"]}
      >
        {payload.name}
      </text>
    </Layer>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  if (!entry?.source) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-foreground">
        {entry.source.name} → {entry.target.name}
      </p>
      <p className="text-muted-foreground">{entry.value} cases</p>
    </div>
  );
}

export function CaseFlowSankey({ data }) {
  const colors = useCssVars([...COLOR_VARS, "--border", "--foreground"]);

  if (!data.nodes.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Not enough case history yet to chart category → outcome flow.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Sankey
        data={data}
        nodeWidth={10}
        nodePadding={20}
        margin={{ left: 20, right: 100, top: 10, bottom: 10 }}
        link={{ stroke: colors["--border"], strokeOpacity: 0.5 }}
        node={<CustomNode colors={colors} />}
        isAnimationActive
        animationDuration={700}
      >
        <Tooltip content={<ChartTooltip />} />
      </Sankey>
    </ResponsiveContainer>
  );
}
