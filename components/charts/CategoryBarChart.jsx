"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCssVars } from "@/hooks/useCssVars";

const BAR_COLOR_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">{payload[0].value} cases (last 90 days)</p>
    </div>
  );
}

export function CategoryBarChart({ data }) {
  const colors = useCssVars([...BAR_COLOR_VARS, "--border", "--muted-foreground", "--secondary"]);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No categorized cases in the last 90 days yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={colors["--border"]} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          stroke={colors["--muted-foreground"]}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          stroke={colors["--muted-foreground"]}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: colors["--secondary"] }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[BAR_COLOR_VARS[i % BAR_COLOR_VARS.length]]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
