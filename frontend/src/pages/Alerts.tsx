import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useI18n } from "../i18n";
import { FraudMap, type HeatSpot } from "../components/FraudMap";
import { AlertIcon } from "../components/icons";

interface AlertItem { id: string; type: string; message: string; createdAt: string; product: { serial: string } | null; }

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [spots, setSpots] = useState<HeatSpot[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    api.get("/reports/alerts").then(({ data }) => setAlerts(data));
    api.get("/reports/heatmap").then(({ data }) => setSpots(data)).catch(() => {});
  }, []);

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of alerts) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
    return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [alerts]);

  return (
    <>
      <div className="page-header">
        <h1>{t("alerts.title")}</h1>
        <p className="muted">{t("alerts.subtitle")}</p>
      </div>

      {byType.length > 0 && (
        <div className="card">
          <h2>Alerts by type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byType} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={50} stroke="var(--ink-secondary)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--ink-secondary)" />
              <Tooltip cursor={{ fill: "var(--card-secondary)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 8, color: "var(--ink)" }} />
              <Bar dataKey="count" fill="#e67e22" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2>{t("alerts.hotspots")}</h2>
        <FraudMap spots={spots} />
        {spots.length > 0 && (
          <div className="hotspots">
            {spots.map((s) => (
              <div key={s.location} className="hotspot" title={`${s.location}: ${s.count}`}>
                <span className="hotspot-name">{s.location}</span>
                <span className="hotspot-count">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="group">
        {alerts.length === 0 && (
          <div className="row"><div className="row-main"><div className="row-sub">{t("alerts.none")}</div></div></div>
        )}
        {alerts.map((a) => (
          <div key={a.id} className="row alert-row">
            <span className="a-icon"><AlertIcon /></span>
            <div className="row-main">
              <div className="a-title">{a.type}</div>
              <div className="a-msg">{a.message}</div>
              <div className="caption" style={{ marginTop: 3 }}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
