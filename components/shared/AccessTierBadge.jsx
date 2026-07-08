import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccessTierBadge({ unmasked }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        unmasked
          ? "border-accent/40 bg-accent/10 text-accent-foreground/80"
          : "border-border bg-secondary text-muted-foreground"
      )}
      title={
        unmasked
          ? "Your role has victim-data clearance. Unmasked views are recorded in the audit trail."
          : "Victim identities are masked by default on this screen."
      }
    >
      {unmasked ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
      {unmasked ? "Restricted — Victim Data Unmasked" : "Standard Access"}
    </span>
  );
}
