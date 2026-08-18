import { useEffect, useState } from "react";
import { api } from "../api";
import type { Product } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";

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

  return (
    <>
      <h1>Distributor</h1>
      <p className="muted">Scan each pack on receipt from the manufacturer. Custody transfer is written to the ledger.</p>

      <ScanInput onResult={receive} buttonLabel="Receive" placeholder="Scan / paste pack QR (MEDG:...)" />
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>In my custody ({mine.length})</h2>
        <table>
          <thead><tr><th>Serial</th><th>Medicine</th><th>Route</th><th>State</th></tr></thead>
          <tbody>
            {mine.map((p) => (
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
