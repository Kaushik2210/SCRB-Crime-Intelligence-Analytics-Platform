"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useCssVars } from "@/hooks/useCssVars";

const COLOR_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

function CustomContent({ depth, x, y, width, height, name, size, colors, index }) {
  if (width <= 0 || height <= 0) return null;
  const isLeaf = depth === 2;
  const fill = isLeaf ? colors[COLOR_VARS[index % COLOR_VARS.length]] ?? "#888" : "transparent";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        style={{
          fill,
          stroke: colors["--border"] ?? "#333",
          strokeWidth: isLeaf ? 1 : 2,
          fillOpacity: isLeaf ? 0.85 : 1,
        }}
      />
      {width > 60 && height > 24 ? (
        <text x={x + 6} y={y + 16} fontSize={11} fill={isLeaf ? colors.leafText : colors.headText}>
          {name}
          {isLeaf ? ` (${size})` : ""}
        </text>
      ) : null}
    </g>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const node = payload[0].payload;
  if (node.children) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{node.name}</p>
      <p className="text-muted-foreground">{node.size} cases</p>
    </div>
  );
}

export function CategoryTreemap({ data }) {
  const colors = useCssVars([...COLOR_VARS, "--border", "--foreground", "--muted-foreground"]);
  const resolved = {
    ...colors,
    border: colors["--border"],
    headText: colors["--muted-foreground"],
    leafText: colors["--foreground"],
  };

  const total = data.reduce((sum, head) => sum + head.children.reduce((s, c) => s + c.size, 0), 0);
  if (total === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Not enough categorized cases yet to build a treemap.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        stroke={resolved.border}
        isAnimationActive
        animationDuration={600}
        content={<CustomContent colors={resolved} />}
      >
        <Tooltip content={<ChartTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
}
