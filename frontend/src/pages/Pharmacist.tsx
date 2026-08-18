import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product, VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";

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

  return (
    <>
      <h1>Pharmacist</h1>
      <p className="muted">Scan a pack to receive it into stock and verify it. Only genuine, chain-complete packs can be dispensed.</p>

      <ScanInput onResult={verify} buttonLabel="Scan & verify" placeholder="Scan / paste pack QR (MEDG:...)" />

      {result && (
        <div className="card">
          <div className="verdict" style={{ color: result.verdict === "GENUINE" ? "var(--green)" : result.verdict === "SUSPICIOUS" ? "var(--amber)" : "var(--red)" }}>
            {result.verdict}
          </div>
          {result.flags.length > 0 && <p className="muted">Flags: {result.flags.join(", ")}</p>}
          {result.product && (
            <>
              <p>
                {result.product.name} · {result.product.batchCode} · <StatusBadge state={result.product.state} />
              </p>
              {result.verdict === "GENUINE" && result.product.state === "AT_PHARMACY" && (
                <button className="green" onClick={() => sell(result.product!.serial)}>Dispense & mark SOLD</button>
              )}
              {result.verdict === "GENUINE" && result.product.state !== "AT_PHARMACY" && (
                <p className="muted">State {result.product.state} — it must reach AT_PHARMACY (received from distributor) before it can be dispensed.</p>
              )}
            </>
          )}
          <Timeline journey={result.journey} />
        </div>
      )}
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>At my pharmacy ({ready.length})</h2>
        <table>
          <thead><tr><th>Serial</th><th>Medicine</th><th>Route</th><th>State</th></tr></thead>
          <tbody>
            {ready.map((p) => (
              <tr key={p.id}>
                <td>{p.serial}</td>
                <td>{p.batch?.name}</td>
                <td>{p.batch?.route}</td>
                <td><StatusBadge state={p.state} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
