import { useEffect, useState } from "react";
import { api } from "../api";
import { AlertIcon } from "../components/icons";

interface AlertItem { id: string; type: string; message: string; createdAt: string; product: { serial: string } | null; }

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    api.get("/reports/alerts").then(({ data }) => setAlerts(data));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Alert feed</h1>
        <p className="muted">Anomalies raised automatically: copied QRs, broken chains, scans outside the declared route, scans after sale.</p>
      </div>

      <div className="group">
        {alerts.length === 0 && (
          <div className="row"><div className="row-main"><div className="row-sub">No alerts. All clean.</div></div></div>
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
