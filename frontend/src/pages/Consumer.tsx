import { useEffect, useState } from "react";
import { api } from "../api";
import type { VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { Timeline } from "../components/Timeline";

export function Consumer() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");

  async function verify(qr: string) {
    setError(""); setResult(null);
    try {
      const { data } = await api.post("/verify", { qr, scan: {} });
      setResult(data);
    } catch {
      setError("Verify failed — did you paste the full MEDG:... text?");
    }
  }

  // Auto-verify when opened via a QR URL (phone camera / Google Lens).
  useEffect(() => {
    const qr = new URLSearchParams(window.location.search).get("qr");
    if (qr) verify(qr);
  }, []);

  return (
    <>
      <h1>Consumer Verification</h1>
      <p className="muted">Scan the QR on your medicine pack to see its full journey — mint, distribution, pharmacy — and confirm it is genuine.</p>

      <ScanInput onResult={verify} buttonLabel="Check" placeholder="Scan / paste the MEDG:... QR text" />

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
