"use client";

import { useRouter } from "next/navigation";
import { CaseMap } from "@/components/map/CaseMap";

/** `navigateToDistrict`: when true, clicking a marker navigates to /districts/[id] (analyst statewide view). */
export function DashboardMap({ points, initialLat, initialLng, initialZoom, navigateToDistrict }) {
  const router = useRouter();

  return (
    <CaseMap
      points={points}
      initialLat={initialLat}
      initialLng={initialLng}
      initialZoom={initialZoom}
      onPointClick={navigateToDistrict ? (point) => router.push(`/districts/${point.id}`) : undefined}
    />
  );
}
