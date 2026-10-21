import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { JourneyMap } from "../components/JourneyMap";
import { getPosition } from "../utils/getPosition";
import { ChatBot } from "../components/ChatBot";
import { CartIcon, CheckIcon, CrossIcon, WarnIcon } from "../components/icons";

/** Exact place name for the accepted order — OSM Nominatim, no key needed. */
async function reverseGeocode(pos: { lat: number; lng: number }): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${pos.lat}&lon=${pos.lng}`);
    if (!r.ok) return "";
    const j = await r.json();
    return typeof j.display_name === "string" ? j.display_name : "";
  } catch {
    return "";
  }
}

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === "GENUINE") return <CheckIcon size={28} />;
  if (verdict === "SUSPICIOUS") return <WarnIcon size={28} />;
  return <CrossIcon size={28} />;
}

export function Consumer() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bought, setBought] = useState(false);
  const [scanPos, setScanPos] = useState<{ lat: number; lng: number } | null>(null);
  const [scanAddr, setScanAddr] = useState("");
  const { search } = useLocation();
  const { t } = useI18n();

  async function verify(qr: string) {
    setError(""); setResult(null); setBought(false); setScanPos(null); setScanAddr(""); setLoading(true);
    try {
      const pos = await getPosition();
      const { data } = await api.post("/verify", { qr, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
      setResult(data);
      setScanPos(pos);
      if (pos) reverseGeocode(pos).then(setScanAddr);
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
      toast.success("Purchased — this pack is now SOLD and retired.");
      setBought(true);
      setResult((r) => r && r.product
        ? { ...r, product: { ...r.product, state: "SOLD" } }
        : r);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Buy failed");
    }
  }

  // Auto-verify when opened via a QR URL (phone camera / Google Lens).
  useEffect(() => {
    const qr = new URLSearchParams(search).get("qr");
    if (qr) verify(qr);
  }, [search]);

  return (
    <>
      <div className="page-header">
        <h1>{t("consumer.title")}</h1>
        <p className="muted">{t("consumer.subtitle")}</p>
      </div>

      <ScanInput onResult={verify} buttonLabel={t("consumer.check")} placeholder={t("consumer.placeholder")} />

      {loading && <p className="muted">{t("consumer.checking")}</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="relative">
          <div className={`verdict ${result.verdict} animate-in`}>
            <span className="v-icon"><VerdictIcon verdict={result.verdict} /></span>
            <div className="v-text">
              <div className="v-label">{t(`verdict.${result.verdict}`)}</div>
              <div className="v-sub">{t(`verdict.${result.verdict}.sub`)}</div>
              {scanPos && (
                <div className="caption" style={{ marginTop: 4 }}>
                  {scanAddr
                    ? `Accepted at ${scanAddr}`
                    : `Location accepted · ${scanPos.lat.toFixed(6)}, ${scanPos.lng.toFixed(6)}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result?.risk && (
        <div className="group">
          <div className="group-title">AI Risk Intelligence · RL bandit</div>
          <div className="row">
            <div className="row-main">
              <div className="row-title">Risk {result.risk.score}/100 · {result.risk.level}</div>
              <div className="row-sub">policy {["sensitive", "balanced", "strict"][result.risk.action]} (threshold {result.risk.threshold}) · state {["low", "medium", "high"][result.risk.state]}</div>
              {result.risk.reasons.length > 0 && (
                <div className="chips" style={{ marginTop: 6 }}>
                  {result.risk.reasons.map((r) => <span key={r} className="chip warn">{r}</span>)}
                </div>
              )}
            </div>
            <span className={`badge ${result.risk.level === "high" ? "COUNTERFEIT" : result.risk.level === "medium" ? "SUSPICIOUS" : "GENUINE"}`}>{result.risk.level}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost small" onClick={async () => { await api.post("/verify/feedback", { serial: result.product!.serial, correct: true }); toast.success("Feedback saved — RL reward +1"); }}>Correct</button>
            <button className="btn btn-ghost small" onClick={async () => { await api.post("/verify/feedback", { serial: result.product!.serial, correct: false }); toast.success("Feedback saved — RL reward -1"); }}>False alarm</button>
            <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>trains the bandit live</span>
          </div>
        </div>
      )}

      {result && result.product && (
        <div className="group">
          <div className="group-title">{t("consumer.pack")}</div>
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
                <div className="row-title">{t("consumer.flags")}</div>
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
              <button className="btn btn-green" style={{ width: "100%" }} onClick={() => buy(result.product!.serial)}>
                <CartIcon /> {t("consumer.buy")}
              </button>
            </div>
          )}
          {bought && <p className="success" style={{ padding: "0.5rem 1.1rem" }}>{t("consumer.purchased")}</p>}
        </div>
      )}

      {result && !result.product && (
        <div className="verdict COUNTERFEIT">
          <span className="v-icon"><CrossIcon /></span>
          <div className="v-text">
            <div className="v-label">{t("consumer.unknown")}</div>
            <div className="v-sub">{t("consumer.unknownSub")}</div>
          </div>
        </div>
      )}

      {result && (
        <div className="group">
          <div className="group-title">{t("consumer.journey")}</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <JourneyMap journey={result.journey} scanLabel={scanAddr || undefined} />
            <div style={{ marginTop: 12 }}>
              <Timeline journey={result.journey} />
            </div>
          </div>
        </div>
      )}

      <ChatBot result={result} />
    </>
  );
}
