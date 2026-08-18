import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
import type { Product, VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { verifyUrl } from "../utils/qrUrl";
import { CartIcon, CheckIcon, CrossIcon, StoreIcon, TruckIcon, WarnIcon } from "../components/icons";

export function Pharmacist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/custody/products");
    setProducts(data);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function verify(qr: string) {
    setError(""); setMsg(""); setResult(null);
    try {
      // One scan advances the chain: receive (DISTRIBUTED → AT_PHARMACY) then verify.
      try {
        const r = await api.post("/custody/receive", { qr });
        setMsg(`Received ${r.data.serial} — state ${r.data.state}. Custody block appended.`);
        load();
      } catch (e: any) {
        const err = e.response?.data?.error ?? "";
        if (!err.startsWith("cannot_receive_from_state_")) setError(err);
      }
      const { data } = await api.post("/verify", { qr, scan: {} });
      setResult(data);
    } catch {
      setError("Verify failed");
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
        <p className="muted">Scan a pack to receive it into stock and verify it. Only genuine, chain-complete packs can be dispensed.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat-icon"><StoreIcon /></span><span className="stat-value">{ready.length}</span><span className="stat-label">Ready to dispense</span></div>
        <div className="stat accent-green"><span className="stat-icon"><CartIcon /></span><span className="stat-value">{sold.length}</span><span className="stat-label">Sold</span></div>
        <div className="stat"><span className="stat-icon"><TruckIcon /></span><span className="stat-value">{received.length}</span><span className="stat-label">Received</span></div>
      </div>

      <div className="section-title">Scan & verify</div>
      <ScanInput onResult={verify} buttonLabel="Scan & verify" placeholder="Scan / paste pack QR (MEDG:...)" />

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
                <CartIcon /> Dispense & mark SOLD
              </button>
            </div>
          )}
          {result.verdict === "GENUINE" && result.product.state !== "AT_PHARMACY" && (
            <div className="row">
              <div className="row-sub">State {result.product.state} — it must reach AT_PHARMACY (received from distributor) before it can be dispensed.</div>
            </div>
          )}
          <div className="group-title" style={{ paddingTop: 6 }}>Ledger journey</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <Timeline journey={result.journey} />
          </div>
        </div>
      )}

      <div className="section-title">At my pharmacy ({ready.length})</div>
      <div className="grid">
        {ready.map((p) => (
          <div key={p.id} className="qr-cell">
            <div>
              <QRCodeCanvas value={verifyUrl(p.qr)} size={160} includeMargin />
            </div>
            <strong>{p.batch?.name}</strong>
            <span className="serial">{p.serial}</span>
            <StatusBadge state={p.state} />
          </div>
        ))}
      </div>
      {ready.length === 0 && <p className="muted">No packs in stock yet.</p>}
    </>
  );
}
