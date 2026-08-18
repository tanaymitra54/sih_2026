import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
import type { Batch } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export function Manufacturer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [name, setName] = useState("Paracetamol 500mg");
  const [quantity, setQuantity] = useState(5);
  const [route, setRoute] = useState("Delhi");
  const [selected, setSelected] = useState<Batch | null>(null);
  const [msg, setMsg] = useState("");

  // QR encodes a URL so a phone camera / Google Lens opens the public verify page.
  const verifyUrl = (qr: string) => `${location.origin}/consumer/verify?qr=${encodeURIComponent(qr)}`;

  async function load() {
    const { data } = await api.get("/batches");
    setBatches(data);
    setSelected((s) => (s ? data.find((b: Batch) => b.id === s.id) ?? null : null));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function create() {
    setMsg("");
    try {
      await api.post("/batches", { name, quantity, route });
      setName(""); setQuantity(5); setMsg("Batch minted — each pack got a signed QR.");
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error ?? "Mint failed — try logging out and back in.");
    }
  }

  return (
    <>
      <h1>Manufacturer</h1>
      <p className="muted">Mint a batch: each pack gets a unique serial + HMAC-signed QR, logged on the ledger.</p>

      <div className="card">
        <h2>Create & mint batch</h2>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          <div><label>Medicine name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label>Quantity</label><input type="number" value={quantity} min={1} onChange={(e) => setQuantity(Number(e.target.value))} /></div>
          <div><label>Declared route</label><input value={route} onChange={(e) => setRoute(e.target.value)} /></div>
        </div>
        {msg && <p className="success">{msg}</p>}
        <button onClick={create}>Mint batch</button>
      </div>

      <div className="card">
        <h2>Batches</h2>
        {batches.length === 0 && <p className="muted">No batches yet.</p>}
        {batches.map((b) => (
          <div key={b.id} style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <span>{b.name} · {b.code} · route {b.route}</span>
            <span className="muted">{b.products.length} packs</span>
            <button className="secondary" onClick={() => setSelected(b)}>View QRs</button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="card">
          <h2>Signed QRs — {selected.name} ({selected.code})</h2>
          <p className="muted">Scan with any phone camera / Google Lens — it opens the public Verify page. Pasting the text also works.</p>
          <div className="grid">
            {selected.products.map((p) => (
              <div key={p.id} className="qr-cell">
                <div id={`qr-${p.id}`}>
                  <QRCodeCanvas value={verifyUrl(p.qr)} size={200} includeMargin />
                </div>
                <StatusBadge state={p.state} />
                <span className="muted">{p.serial}</span>
                <button
                  onClick={() => {
                    const c = document.getElementById(`qr-${p.id}`)?.querySelector("canvas") as HTMLCanvasElement | null;
                    const a = document.createElement("a");
                    a.href = c ? c.toDataURL("image/png") : "";
                    a.download = `${p.serial}.png`;
                    a.click();
                  }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
