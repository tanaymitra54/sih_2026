import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import type { VerifyResult } from "../types";
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

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === "GENUINE") return <CheckIcon />;
  if (verdict === "SUSPICIOUS") return <WarnIcon />;
  return <CrossIcon />;
}

const VERDICT_COPY: Record<string, { label: string; sub: string }> = {
  GENUINE: { label: "Genuine", sub: "Signature valid · chain intact · verified on the ledger" },
  SUSPICIOUS: { label: "Suspicious", sub: "Review the flags below — do not dispense without checking" },
  COUNTERFEIT: { label: "Counterfeit", sub: "This pack failed verification — do not consume or sell it" },
};

export function Consumer() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bought, setBought] = useState(false);
  const { search } = useLocation();

  async function verify(qr: string) {
    setError(""); setResult(null); setBought(false); setLoading(true);
    try {
      const { data } = await api.post("/verify", { qr, scan: {} });
      setResult(data);
      if (data.product?.state === "SOLD") setBought(true);
    } catch {
      setError("Verify failed — did you paste the full MEDG:... text?");
    } finally {
      setLoading(false);
    }
  }

  async function buy(serial: string) {
    setError("");
    try {
      await api.post("/verify/buy", { serial });
      setBought(true);
      setResult((r) => r && r.product
        ? { ...r, product: { ...r.product, state: "SOLD" } }
        : r);
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Buy failed");
    }
  }

  // Auto-verify when opened via a QR URL (phone camera / Google Lens).
  useEffect(() => {
    const qr = new URLSearchParams(search).get("qr");
    if (qr) verify(qr);
  }, [search]);

  const copy = result ? VERDICT_COPY[result.verdict] : null;

  return (
    <>
      <div className="page-header">
        <h1>Verify a medicine</h1>
        <p className="muted">Scan the QR on your pack to see its full journey — mint, distribution, pharmacy — and confirm it is genuine. No login or app needed.</p>
      </div>

      <ScanInput onResult={verify} buttonLabel="Check" placeholder="Scan / paste the MEDG:... QR text" />

      {loading && <p className="muted">Checking pack…</p>}
      {error && <p className="error">{error}</p>}

      {result && copy && (
        <div className={`verdict ${result.verdict} animate-in`}>
          <span className="v-icon"><VerdictIcon verdict={result.verdict} /></span>
          <div className="v-text">
            <div className="v-label">{copy.label}</div>
            <div className="v-sub">{copy.sub}</div>
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
          {result.flags.length > 0 && (
            <div className="row">
              <div className="row-main">
                <div className="row-title">Flags</div>
                <div className="chips" style={{ marginTop: 6 }}>
                  {result.flags.map((f) => (
                    <span key={f} className={`chip ${f.includes("signature") || f.includes("broken") || f.includes("handoff") ? "danger" : "warn"}`}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {result.verdict === "GENUINE" && result.product.state === "AT_PHARMACY" && !bought && (
            <div className="row">
              <button className="btn btn-green" style={{ width: "100%" }} onClick={() => buy(result.product!.serial)}>Buy</button>
            </div>
          )}
          {bought && <p className="success" style={{ padding: "0.5rem 1.1rem" }}>Purchased — this pack is now SOLD.</p>}
        </div>
      )}

      {result && !result.product && (
        <div className="verdict COUNTERFEIT">
          <span className="v-icon"><CrossIcon /></span>
          <div className="v-text">
            <div className="v-label">Unknown code</div>
            <div className="v-sub">This code was never minted by a registered manufacturer.</div>
          </div>
        </div>
      )}

      {result && (
        <div className="group">
          <div className="group-title">Journey on the ledger</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <Timeline journey={result.journey} />
          </div>
        </div>
      )}
    </>
  );
}
