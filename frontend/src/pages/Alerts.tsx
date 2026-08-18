import { useEffect, useState } from "react";
import { api } from "../api";

interface AlertItem { id: string; type: string; message: string; createdAt: string; product: { serial: string } | null; }

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    api.get("/reports/alerts").then(({ data }) => setAlerts(data));
  }, []);

  return (
    <>
      <h1>Alert feed</h1>
      <p className="muted">Anomalies raised automatically: copied QRs, broken chains, scans outside the declared route, scans after sale.</p>
      <div className="card">
        {alerts.length === 0 && <p className="muted">No alerts.</p>}
        {alerts.map((a) => (
          <div key={a.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
            <div><strong>{a.type}</strong> <span className="muted">· {new Date(a.createdAt).toLocaleString()}</span></div>
            <div className="muted">{a.message}</div>
          </div>
        ))}
      </div>
    </>
  );
}
