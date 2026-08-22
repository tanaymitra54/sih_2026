import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface HeatSpot {
  location: string;
  count: number;
  lat: number | null;
  lng: number | null;
}

/** Region heat map: circle size + fill opacity scale with suspicious-scan count. */
export function FraudMap({ spots }: { spots: HeatSpot[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const points = spots.filter((s): s is HeatSpot & { lat: number; lng: number } => s.lat != null && s.lng != null);
  const pointsKey = JSON.stringify(points.map((p) => [p.location, p.count]));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length === 0) return;

    const map = L.map(el, { scrollWheelZoom: false });
    // Start on India; fitBounds below zooms in but never past country level.
    map.setView([22.5, 79], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const max = Math.max(...points.map((p) => p.count), 1);
    points.forEach((p) => {
      const t = p.count / max;
      L.circleMarker([p.lat, p.lng], {
        radius: 9 + t * 22,
        color: "#ad3b32",
        weight: 1.5,
        fillColor: "#c0392b",
        fillOpacity: 0.2 + t * 0.55,
      })
        .addTo(map)
        .bindPopup(`<strong>${p.location}</strong><br/>${p.count} suspicious scan${p.count === 1 ? "" : "s"}`);
    });

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
    };
  }, [pointsKey]);

  if (points.length === 0) return <p className="muted">No located fraud reports yet.</p>;
  return <div ref={containerRef} style={{ height: 300, width: "100%", borderRadius: 4 }} />;
}
