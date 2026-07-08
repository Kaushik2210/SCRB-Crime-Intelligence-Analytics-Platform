import { cn } from "@/lib/utils";

const TIER_LABELS = ["Minimal", "Low", "Moderate", "Elevated", "Heightened"];

// Calm sequential gradient (sage -> teal -> gold -> amber -> deep indigo).
// Deliberately avoids red/black alarm colors per the platform's institutional,
// non-alarmist design direction.
const TIER_STYLES = [
  "bg-[var(--chart-1)]/15 text-[var(--chart-1)] border-[var(--chart-1)]/30",
  "bg-[var(--chart-2)]/15 text-[var(--chart-2)] border-[var(--chart-2)]/30",
  "bg-[var(--chart-3)]/20 text-[var(--chart-3)] border-[var(--chart-3)]/40",
  "bg-[var(--chart-4)]/20 text-[var(--chart-4)] border-[var(--chart-4)]/40",
  "bg-[var(--chart-5)]/15 text-[var(--chart-5)] border-[var(--chart-5)]/30",
];

export function SeverityBadge({ tier, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TIER_STYLES[tier - 1],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {TIER_LABELS[tier - 1]}
    </span>
  );
}
