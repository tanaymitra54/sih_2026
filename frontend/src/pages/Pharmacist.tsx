import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product, VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function Pharmacist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/custody/products");
    setProducts(data);
  }
  useEffect(() => { load(); }, []);

  async function verify(qr: string) {
    setError(""); setMsg(""); setResult(null);
    try {
      const { data } = await api.post("/verify", { qr, scan: {} });
      setResult(data);
    } catch {
      setError("Verify failed");
    }
  }

  async function receive(qr: string) {
    setError(""); setMsg("");
    try {
      const { data } = await api.post("/custody/receive", { qr });
      setMsg(`Received ${data.serial} — state ${data.state}. Custody block appended.`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Receive failed");
    }
  }

  async function sell(serial: string) {
    setError(""); setMsg("");
    try {
      const { data } = await api.post("/custody/sell", { serial });
      setMsg(`Dispensed ${data.serial} — state SOLD. Chain closed.`);
      setResult(null);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Sell failed");
    }
  }

  const ready = products.filter((p) => p.state === "AT_PHARMACY");
  const sold = products.filter((p) => p.state === "SOLD");
  const received = products.filter((p) => p.state !== "CREATED");

  return (
    <>
      <div className="page-header">
        <h1>Pharmacist</h1>
        <p className="muted">Verify before sale: signature check + custody-chain check. Only genuine, chain-complete packs can be dispensed.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat-value">{ready.length}</span><span className="stat-label">Ready to dispense</span></div>
        <div className="stat accent-green"><span className="stat-value">{sold.length}</span><span className="stat-label">Sold</span></div>
        <div className="stat"><span className="stat-value">{received.length}</span><span className="stat-label">Received</span></div>
      </div>

      <div className="section-title">Receive from distributor</div>
      <ScanInput onResult={receive} buttonLabel="Receive" placeholder="Scan / paste pack QR (MEDG:...)" />

      <div className="section-title">Verify before sale</div>
      <ScanInput onResult={verify} buttonLabel="Verify" placeholder="Scan / paste pack QR (MEDG:...)" />

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className={`verdict ${result.verdict} animate-in`}>
          <span className="v-icon">
            {result.verdict === "GENUINE" ? <CheckIcon /> : result.verdict === "SUSPICIOUS" ? <WarnIcon /> : <CrossIcon />}
          </span>
          <div className="v-text">
            <div className="v-label">{result.verdict}</div>
            {result.flags.length > 0 && <div className="v-sub">Flags: {result.flags.join(", ")}</div>}
          </div>
        </div>
      )}

      {result && result.product && (
        <div className="group">
          <div className="group-title">Pack</div>
          <div className="row">
            <div className="row-main">
              <div className="row-title">{result.product.name}</div>
              <div className="row-sub">Batch {result.product.batchCode} · Serial {result.product.serial}</div>
            </div>
            <StatusBadge state={result.product.state} />
          </div>
          {result.verdict === "GENUINE" && result.product.state === "AT_PHARMACY" && (
            <div className="row">
              <button className="btn btn-green" style={{ width: "100%" }} onClick={() => sell(result.product!.serial)}>
                Dispense & mark SOLD
              </button>
            </div>
          )}
          <div className="group-title" style={{ paddingTop: 6 }}>Ledger journey</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <Timeline journey={result.journey} />
          </div>
        </div>
      )}

      <div className="group">
        <div className="group-title">At my pharmacy ({ready.length})</div>
        {ready.length === 0 && <div className="row"><div className="row-main"><div className="row-sub">No packs ready to dispense.</div></div></div>}
        {ready.length > 0 && (
          <div className="table-wrap">
            <table className="table-responsive">
              <thead><tr><th>Serial</th><th>Medicine</th><th>Route</th><th>State</th></tr></thead>
              <tbody>
                {ready.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Serial">{p.serial}</td>
                    <td data-label="Medicine">{p.batch?.name}</td>
                    <td data-label="Route">{p.batch?.route}</td>
                    <td data-label="State"><StatusBadge state={p.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
