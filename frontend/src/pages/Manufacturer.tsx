import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
import type { Batch } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { verifyUrl } from "../utils/qrUrl";

function ChevronIcon() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Manufacturer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [name, setName] = useState("Paracetamol 500mg");
  const [quantity, setQuantity] = useState(5);
  const [route, setRoute] = useState("Delhi");
  const [selected, setSelected] = useState<Batch | null>(null);
  const [msg, setMsg] = useState("");

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
      <div className="page-header">
        <h1>Manufacturer</h1>
        <p className="muted">Mint a batch: each pack gets a unique serial + HMAC-signed QR, logged on the ledger.</p>
      </div>

      <div className="card">
        <h2>Create & mint batch</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 1rem" }}>
          <div className="field"><label>Medicine name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Quantity</label><input type="number" value={quantity} min={1} onChange={(e) => setQuantity(Number(e.target.value))} /></div>
          <div className="field"><label>Declared route</label><input value={route} onChange={(e) => setRoute(e.target.value)} /></div>
        </div>
        {msg && <p className="success">{msg}</p>}
        <button className="btn" onClick={create}>Mint batch</button>
      </div>

      <div className="group">
        <div className="group-title">Batches ({batches.length})</div>
        {batches.length === 0 && <div className="row"><div className="row-main"><div className="row-sub">No batches yet.</div></div></div>}
        {batches.map((b) => (
          <div key={b.id} className="row clickable" onClick={() => setSelected(b)}>
            <div className="row-main">
              <div className="row-title">{b.name}</div>
              <div className="row-sub">{b.code} · route {b.route} · {b.products.length} packs</div>
            </div>
            <ChevronIcon />
          </div>
        ))}
      </div>

      {selected && (
        <div className="card animate-in">
          <h2>Signed QRs — {selected.name} ({selected.code})</h2>
          <p className="muted">Scan with any phone camera / Google Lens — it opens the public Verify page. Pasting the text also works.</p>
          <div className="grid">
            {selected.products.map((p) => (
              <div key={p.id} className="qr-cell">
                <div id={`qr-${p.id}`}>
                  <QRCodeCanvas value={verifyUrl(p.qr)} size={160} includeMargin />
                </div>
                <StatusBadge state={p.state} />
                <span className="serial">{p.serial}</span>
                <button
                  className="btn btn-ghost small"
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
