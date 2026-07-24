"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/**
 * OpenStreetMap tiles via Leaflet — free, no API key/token required (unlike
 * the previous Mapbox integration). OSM's tile usage policy asks for
 * reasonable, non-bulk use, which fits this app's traffic.
 */
export function CaseMap({ points, initialLat, initialLng, initialZoom = 6.2, height = 420, onPointClick }) {
  const maxWeight = useMemo(() => Math.max(1, ...points.map((p) => p.weight ?? 1)), [points]);

  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ height }}>
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={initialZoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => {
          const radius = 5 + ((point.weight ?? 1) / maxWeight) * 11;
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                color: "var(--background)",
                weight: 2,
                fillColor: `color-mix(in oklab, var(${point.colorVar ?? "--primary"}) 75%, transparent)`,
                fillOpacity: 1,
              }}
              eventHandlers={onPointClick ? { click: () => onPointClick(point) } : undefined}
            >
              <Tooltip>{point.label}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
