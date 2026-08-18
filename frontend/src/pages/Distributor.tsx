import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { BoxIcon, TruckIcon } from "../components/icons";

export function Distributor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/custody/products");
    setProducts(data);
  }
  useEffect(() => { load(); }, []);

  async function receive(qr: string) {
    setError(""); setMsg("");
    try {
      const { data } = await api.post("/custody/receive", { qr });
      setMsg(`Received ${data.serial} — state ${data.state}. Custody block appended to the ledger.`);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Receive failed");
    }
  }

  const mine = products.filter((p) => p.state === "DISTRIBUTED");
  const created = products.filter((p) => p.state === "CREATED");

  return (
    <>
      <div className="page-header">
        <h1>Distributor</h1>
        <p className="muted">Scan each pack on receipt from the manufacturer. Custody transfer is written to the ledger.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat-icon"><TruckIcon /></span><span className="stat-value">{mine.length}</span><span className="stat-label">In my custody</span></div>
        <div className="stat accent-saffron"><span className="stat-icon"><BoxIcon /></span><span className="stat-value">{created.length}</span><span className="stat-label">Awaiting receive</span></div>
        <div className="stat"><span className="stat-icon"><BoxIcon /></span><span className="stat-value">{products.length}</span><span className="stat-label">Total packs</span></div>
      </div>

      <ScanInput onResult={receive} buttonLabel="Receive" placeholder="Scan / paste pack QR (MEDG:...)" />
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="group">
        <div className="group-title">In my custody ({mine.length})</div>
        {mine.length === 0 && <div className="row"><div className="row-main"><div className="row-sub">No packs in custody yet.</div></div></div>}
        {mine.length > 0 && (
          <div className="table-wrap">
            <table className="table-responsive">
              <thead><tr><th>Serial</th><th>Medicine</th><th>Route</th><th>State</th></tr></thead>
              <tbody>
                {mine.map((p) => (
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
