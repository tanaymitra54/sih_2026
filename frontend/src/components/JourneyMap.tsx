import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { JourneyItem } from "../types";

interface Point {
  lat: number;
  lng: number;
  action: string;
  location?: string;
  who?: string;
  time?: string;
}

function pointsOf(journey: JourneyItem[]): Point[] {
  const out: Point[] = [];
  for (const j of journey) {
    const lat = Number(j.payload.lat);
    const lng = Number(j.payload.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      lat,
      lng,
      action: j.action,
      location: j.payload.location ? String(j.payload.location) : undefined,
      who: String(j.payload.role ?? j.payload.by ?? j.signer),
      time: j.timestamp ? new Date(j.timestamp * 1000).toLocaleString() : undefined,
    });
  }
  return out;
}

export function JourneyMap({ journey }: { journey: JourneyItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const points = pointsOf(journey);
  const pointsKey = JSON.stringify(points.map((p) => [p.lat, p.lng]));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length === 0) return;

    const map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenFreeMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const positions: [number, number][] = points.map((p) => [p.lat, p.lng]);

    if (positions.length > 1) {
      L.polyline(positions, { color: "#e67e22", weight: 3 }).addTo(map);
    }

    points.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: "#c0392b",
        fillColor: "#e67e22",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${p.action}</strong>${p.location ? ` · ${p.location}` : ""}<br/>by ${p.who}` +
            (p.time ? `<br/>${p.time}` : ""),
        );
    });

    if (positions.length === 1) map.setView(positions[0], 7);
    else map.fitBounds(positions, { padding: [40, 40] });

    return () => {
      map.remove();
    };
  }, [pointsKey]);

  if (points.length === 0) return <p className="muted">No location data for this pack yet.</p>;
  return <div ref={containerRef} style={{ height: 260, width: "100%", borderRadius: 8 }} />;
}
