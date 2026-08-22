import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Product, VerifyResult } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { JourneyMap } from "../components/JourneyMap";
import { CountStat } from "../components/CountStat";
import { verifyUrl } from "../utils/qrUrl";
import { getPosition } from "../utils/getPosition";
import type { Coords } from "../utils/getPosition";
import { CartIcon, CheckIcon, CrossIcon, StoreIcon, TruckIcon, WarnIcon } from "../components/icons";

export function Pharmacist() {
  const [products, setProducts] = useState<Product[]>([]);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanPos, setScanPos] = useState<Coords | null>(null);
  const { t } = useI18n();

  async function load() {
    const { data } = await api.get("/custody/products");
    setProducts(data);
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  async function verify(qr: string) {
    setResult(null);
    try {
      // Ask the phone for its location first — feeds geo flags, alerts and the heatmap.
      const pos = await getPosition();
      setScanPos(pos);
      // One scan advances the chain: receive (DISTRIBUTED → AT_PHARMACY) then verify.
      try {
        const r = await api.post("/custody/receive", { qr, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
        toast.success(`Received ${r.data.serial} — state ${r.data.state}. Custody block appended.`);
        load();
      } catch (e: any) {
        const err = e.response?.data?.error ?? "";
        if (!err.startsWith("cannot_receive_from_state_")) toast.error(err);
      }
      const { data } = await api.post("/verify", { qr, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
      setResult(data);
    } catch {
      toast.error("Verify failed");
    }
  }

  async function sell(serial: string) {
    try {
      // Get current GPS location for the custody block
      const pos = await getPosition();
      const { data } = await api.post("/custody/sell", { serial, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
      toast.success(`Dispensed ${data.serial} — state SOLD. Chain closed.`);
      setResult(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Sell failed");
    }
  }

  const ready = products.filter((p) => p.state === "AT_PHARMACY");
  const sold = products.filter((p) => p.state === "SOLD");
  const received = products.filter((p) => p.state !== "CREATED");

  return (
    <>
      <div className="page-header">
        <h1>{t("pharma.title")}</h1>
        <p className="muted">{t("pharma.subtitle")}</p>
      </div>

      <div className="stats">
        <CountStat value={ready.length} label={t("pharma.ready")} icon={<StoreIcon />} />
        <CountStat value={sold.length} label={t("pharma.sold")} icon={<CartIcon />} className="accent-green" />
        <CountStat value={received.length} label={t("pharma.received")} icon={<TruckIcon />} />
      </div>

      <div className="section-title">{t("pharma.scanVerify")}</div>
      <ScanInput onResult={verify} buttonLabel={t("pharma.scanVerify")} placeholder="Scan / paste pack QR (MEDG:...)" />

      {result && (
        <div className="relative">
          <div className={`verdict ${result.verdict} animate-in`}>
            <span className="v-icon">
              {result.verdict === "GENUINE" ? <CheckIcon /> : result.verdict === "SUSPICIOUS" ? <WarnIcon /> : <CrossIcon />}
            </span>
            <div className="v-text">
              <div className="v-label">{t(`verdict.${result.verdict}`)}</div>
              {result.flags.length > 0 && <div className="v-sub">Flags: {result.flags.join(", ")}</div>}
              {scanPos && (
                <div className="caption" style={{ marginTop: 4 }}>
                  Scan location accepted · {scanPos.lat.toFixed(5)}, {scanPos.lng.toFixed(5)}
                </div>
              )}
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
          {result.verdict === "GENUINE" && result.product.state === "AT_PHARMACY" && (
            <div className="row">
              <button className="btn btn-green" style={{ width: "100%" }} onClick={() => sell(result.product!.serial)}>
                <CartIcon /> {t("pharma.dispense")}
              </button>
            </div>
          )}
          {result.verdict === "GENUINE" && result.product.state !== "AT_PHARMACY" && (
            <div className="row">
              <div className="row-sub">State {result.product.state} — it must reach AT_PHARMACY (received from distributor) before it can be dispensed.</div>
            </div>
          )}
          <div className="group-title" style={{ paddingTop: 6 }}>{t("consumer.journey")}</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <JourneyMap journey={result.journey} />
            <div style={{ marginTop: 12 }}>
              <Timeline journey={result.journey} />
            </div>
          </div>
        </div>
      )}

      <div className="section-title">{t("pharma.atPharmacy")} ({ready.length})</div>
      <div className="grid">
        {ready.map((p) => (
          <div key={p.id} className="qr-cell">
            <div>
              <QRCodeCanvas value={verifyUrl(p.qr)} size={160} includeMargin />
            </div>
            <strong>{p.batch?.name}</strong>
            <span className="serial">{p.serial}</span>
            <StatusBadge state={p.state} />
          </div>
        ))}
      </div>
      {ready.length === 0 && <p className="muted">{t("pharma.noStock")}</p>}
    </>
  );
}
