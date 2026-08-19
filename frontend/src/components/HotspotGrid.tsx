import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";

interface Spot {
  location: string;
  count: number;
}

/** GitHub-contribution-style fraud hotspot grid, colored by alert intensity. */
export function HotspotGrid() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    api.get("/reports/heatmap").then(({ data }) => setSpots(data)).catch(() => {});
  }, []);

  if (spots.length === 0) return null;
  const max = Math.max(...spots.map((s) => s.count), 1);

  return (
    <div className="card">
      <h2>{t("alerts.hotspots")}</h2>
      <div className="hotspots">
        {spots.map((s) => (
          <div
            key={s.location}
            className="hotspot"
            title={`${s.location}: ${s.count}`}
            style={{ "--intensity": Math.min(s.count / max, 1) } as React.CSSProperties}
          >
            <span className="hotspot-name">{s.location}</span>
            <span className="hotspot-count">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
