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
import { ChatBot } from "../components/ChatBot";
import { CartIcon, CheckIcon, CrossIcon, WarnIcon } from "../components/icons";

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 30000 },
    );
  });
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
  const { search } = useLocation();
  const { t } = useI18n();

  async function verify(qr: string) {
    setError(""); setResult(null); setBought(false); setLoading(true);
    try {
      const pos = await getPosition();
      const { data } = await api.post("/verify", { qr, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
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
            </div>
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
            <JourneyMap journey={result.journey} />
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
