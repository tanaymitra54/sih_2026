import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  alertCount: number;
  scanCount: number;
  topTypes: string[];
  riskScore: number;
  boundary: [number, number][];
}

interface HeatmapResponse {
  points: HeatPoint[];
  h3Res: number;
  generatedAt: string;
}

export function HeatmapV2() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [layer, setLayer] = useState<"alerts" | "scans" | "all">("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ timeRange, includeScans: (layer !== "alerts").toString() });
      const res = await fetch(`/api/reports/heatmap-v2?${params}`);
      if (!res.ok) throw new Error("Failed to load heatmap");
      const data: HeatmapResponse = await res.json();
      renderHeatmap(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderHeatmap = (data: HeatmapResponse) => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
    const heatPoints = data.points.map((p) => [p.lat, p.lng, p.weight] as [number, number, number]);
    heatLayerRef.current = (L as any).heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.2: "#fee", 0.4: "#fcc", 0.6: "#e55", 0.8: "#c00", 1.0: "#800" },
    }).addTo(map);

    if (data.points.length) {
      const bounds = L.latLngBounds(data.points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, { scrollWheelZoom: false });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
    map.setView([22.5, 79], 5);
    fetchData();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [timeRange, layer]);

  if (error) return <div className="error">Failed to load heatmap: {error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="heatmap-controls" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Time:
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
          </select>
        </label>
        <label>
          Layer:
          <select value={layer} onChange={(e) => setLayer(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="alerts">Alerts only</option>
            <option value="scans">All scans</option>
            <option value="all">Alerts + Scans</option>
          </select>
        </label>
        {loading && <span className="muted">Loading&hellip;</span>}
      </div>
      <div ref={containerRef} style={{ height: 400, width: "100%", borderRadius: 8 }} />
    </div>
  );
}