import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPinned, Network, LineChart, ScanSearch, ShieldCheck, Lock } from "lucide-react";

const CAPABILITIES = [
  {
    icon: MapPinned,
    title: "Spatial Visualization",
    description:
      "District-to-station drill-down maps and hotspot heatmaps replace static spreadsheets with live geographic context.",
  },
  {
    icon: Network,
    title: "Network & Link Analysis",
    description:
      "Surface repeat offenders and shared modus operandi across jurisdictions through case, accused, and location linkages.",
  },
  {
    icon: LineChart,
    title: "Predictive Dashboards",
    description:
      "Calm, gradient-based risk scoring by district and crime category — signal, not alarm, for investigators under pressure.",
  },
  {
    icon: ScanSearch,
    title: "AI/ML Pattern Detection",
    description:
      "Baseline-deviation anomaly detection turns raw case volume into plain-language callouts an officer can act on.",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-heading text-sm font-semibold tracking-tight">
              Karnataka State Police · State Crime Records Bureau
            </span>
          </div>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-accent-foreground/70">
            Internal Platform — Authorized Personnel Only
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Crime Intelligence &amp; Analytics Platform
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground">
            A unified command center that replaces siloed, district-level Excel FIR reporting with integrated
            geographic, network, and predictive intelligence — turning fragmented case records into actionable
            insight before incidents escalate.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Sign in to your workspace
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <Card key={c.title} className="border-border/80">
                <CardHeader>
                  <c.icon className="size-5 text-primary" />
                  <CardTitle className="pt-2 text-base font-heading">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <div className="flex items-start gap-4">
              <Lock className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Data security &amp; access compliance
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Access is scoped server-side to each officer&apos;s district and unit — no jurisdiction ever sees
                  another&apos;s case data. Victim identities are masked by default across the platform and only
                  unmasked for personnel with explicit clearance, with every such access recorded in an audit trail.
                  Demographic correlations are surfaced strictly as statistical aggregates, never as individual-level
                  filters or exports.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Internal tool for authorized KSP/SCRB personnel. Not for public distribution.
      </footer>
    </div>
  );
}
