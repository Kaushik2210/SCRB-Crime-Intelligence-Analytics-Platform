"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value from 0 up to `target` over `duration` ms on mount
 * (and whenever `target` changes). Non-numeric targets (e.g. percentage
 * strings) are returned as-is so callers can pass either through KpiCard.
 */
export function useCountUp(target, duration = 700) {
  const numeric = typeof target === "number" && Number.isFinite(target);
  const [value, setValue] = useState(numeric ? 0 : target);
  const frameRef = useRef();

  useEffect(() => {
    if (!numeric) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-soft cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, numeric]);

  return value;
}
