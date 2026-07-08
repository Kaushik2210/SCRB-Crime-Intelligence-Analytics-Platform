"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCssVars } from "@/hooks/useCssVars";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} cases</p>
    </div>
  );
}

export function TrendLineChart({ data }) {
  const colors = useCssVars(["--chart-2", "--border", "--muted-foreground"]);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Not enough recent history to chart a trend yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={colors["--border"]} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="week" stroke={colors["--muted-foreground"]} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={colors["--muted-foreground"]} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors["--border"] }} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={colors["--chart-2"]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive
          animationDuration={700}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
