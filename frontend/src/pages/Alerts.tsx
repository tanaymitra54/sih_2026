import { useEffect, useState } from "react";
import { api } from "../api";

interface AlertItem { id: string; type: string; message: string; createdAt: string; product: { serial: string } | null; }

function AlertIcon({ type }: { type: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  if (type.includes("signature") || type.includes("chain") || type.includes("minted")) {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

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
            <span className="a-icon"><AlertIcon type={a.type} /></span>
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
