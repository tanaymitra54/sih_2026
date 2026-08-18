import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import type { VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { Timeline } from "../components/Timeline";

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

  return (
    <>
      <h1>Consumer Verification</h1>
      <p className="muted">Scan the QR on your medicine pack to see its full journey — mint, distribution, pharmacy — and confirm it is genuine.</p>

      <ScanInput onResult={verify} buttonLabel="Check" placeholder="Scan / paste the MEDG:... QR text" />

      {loading && <p className="muted">Checking pack…</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <div
            className="verdict"
            style={{ color: result.verdict === "GENUINE" ? "var(--green)" : result.verdict === "SUSPICIOUS" ? "var(--amber)" : "var(--red)" }}
          >
            {result.verdict}
          </div>
          {result.product ? (
            <>
              <p>
                <strong>{result.product.name}</strong> · batch {result.product.batchCode} · serial {result.product.serial} ·{" "}
                state <strong>{result.product.state}</strong>
              </p>
              {result.flags.length > 0 && <p className="muted">Notes: {result.flags.join(", ")}</p>}
              {result.verdict === "GENUINE" && result.product.state === "AT_PHARMACY" && !bought && (
                <button className="green" onClick={() => buy(result.product!.serial)}>Buy</button>
              )}
              {bought && <p className="success">Purchased — this pack is now SOLD.</p>}
            </>
          ) : (
            <p className="muted">No product matches this code — it was never minted by a registered manufacturer.</p>
          )}
          <h2>Journey on the ledger</h2>
          <Timeline journey={result.journey} />
        </div>
      )}
    </>
  );
}
