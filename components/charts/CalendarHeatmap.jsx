import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Calm severity gradient reused for intensity — no DOM-attribute resolution
// issue here since these render as plain <div> elements (unlike the Canvas/
// SVG-based charts elsewhere, which need useCssVars to resolve var(--x)).
const INTENSITY_CLASSES = [
  "bg-muted",
  "bg-[var(--chart-1)]/35",
  "bg-[var(--chart-2)]/55",
  "bg-[var(--chart-3)]/70",
  "bg-[var(--chart-4)]/85",
  "bg-[var(--chart-5)]",
];

function bucket(count, max) {
  if (count === 0) return 0;
  if (max <= 1) return count > 0 ? 3 : 0;
  const ratio = count / max;
  return Math.min(5, 1 + Math.floor(ratio * 4));
}

/** GitHub-style calendar heatmap of daily case counts, hand-rolled (no charting library needed). */
export function CalendarHeatmap({ data, weeks = 53 }) {
  const countByDate = new Map(data.map((d) => [d.date, d.count]));
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - totalDays + 1);
  // Align to the most recent Sunday on/before `start` so columns are full weeks.
  start.setDate(start.getDate() - start.getDay());

  const columns = [];
  const monthMarkers = [];
  let cursor = new Date(start);
  let lastMonth = null;

  for (let w = 0; w < weeks; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const inRange = cursor <= today;
      column.push({ date: iso, count: inRange ? countByDate.get(iso) ?? 0 : null });
      if (d === 0) {
        const month = cursor.getMonth();
        if (month !== lastMonth) {
          monthMarkers.push({ week: w, label: MONTH_LABELS[month] });
          lastMonth = month;
        }
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
        Not enough recent case history to chart daily density yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ width: weeks * 13 + 24 }}>
        <div className="relative mb-1 h-4 text-[10px] text-muted-foreground">
          {monthMarkers.map((m) => (
            <span key={`${m.label}-${m.week}`} className="absolute" style={{ left: m.week * 13 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((column, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {column.map((cell, d) => (
                <div
                  key={d}
                  title={cell.count == null ? undefined : `${cell.date}: ${cell.count} case${cell.count === 1 ? "" : "s"}`}
                  className={cn(
                    "size-[10px] rounded-[2px]",
                    cell.count == null ? "opacity-0" : INTENSITY_CLASSES[bucket(cell.count, maxCount)]
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
