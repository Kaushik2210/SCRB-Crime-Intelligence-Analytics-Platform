"use client";

import { useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPinned } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function CaseMap({ points, initialLat, initialLng, initialZoom = 6.2, height = 420, onPointClick }) {
  const maxWeight = useMemo(() => Math.max(1, ...points.map((p) => p.weight ?? 1)), [points]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground"
        style={{ height }}
      >
        <MapPinned className="size-6" />
        <p className="max-w-xs">
          Map view requires a Mapbox access token. Set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
          your <code className="font-mono">.env</code> file to enable this view.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ height }}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ latitude: initialLat, longitude: initialLng, zoom: initialZoom }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {points.map((point) => {
          const size = 10 + ((point.weight ?? 1) / maxWeight) * 22;
          return (
            <Marker key={point.id} latitude={point.lat} longitude={point.lng} anchor="center">
              <button
                type="button"
                onClick={() => onPointClick?.(point)}
                title={point.label}
                className="rounded-full border-2 border-background shadow-sm transition-transform hover:scale-110"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: `color-mix(in oklab, var(${point.colorVar ?? "--primary"}) 75%, transparent)`,
                }}
              />
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
