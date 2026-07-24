"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet is a large, DOM-only library — code-split it into its own chunk
 * and skip SSR entirely. `dynamic(..., { ssr: false })` is only allowed
 * inside a Client Component (Next.js 16+ rejects it in Server Components),
 * so this thin wrapper is the one place that calls it; both server-rendered
 * pages and other client components import LazyCaseMap instead of CaseMap
 * directly.
 */
export const LazyCaseMap = dynamic(() => import("@/components/map/CaseMap").then((m) => m.CaseMap), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-lg bg-muted" />,
});
