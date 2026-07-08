"use client";

import { useCountUp } from "@/hooks/useCountUp";

/** Client-only leaf so the surrounding KpiCard can stay a server component. */
export function CountUpValue({ value }) {
  return useCountUp(value);
}
