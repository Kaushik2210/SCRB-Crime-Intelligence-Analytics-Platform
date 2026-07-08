"use client";

import { useEffect, useState } from "react";

/**
 * Resolves CSS custom properties to literal values via getComputedStyle.
 * Needed anywhere a value is consumed by an SVG presentation attribute or
 * <canvas> context (Recharts, react-force-graph) — those can't resolve
 * `var(--x)` the way a DOM element's inline `style` can.
 */
export function useCssVars(varNames) {
  const [values, setValues] = useState({});
  const key = varNames.join(",");

  useEffect(() => {
    function resolve() {
      const styles = getComputedStyle(document.documentElement);
      const next = {};
      for (const name of key.split(",")) {
        next[name] = styles.getPropertyValue(name).trim() || undefined;
      }
      setValues(next);
    }

    resolve();
    // Re-resolve when the theme toggle flips the `dark` class on <html>.
    const observer = new MutationObserver(resolve);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return values;
}
