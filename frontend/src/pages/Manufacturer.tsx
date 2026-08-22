import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Batch } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { verifyUrl } from "../utils/qrUrl";
import { CountStat } from "../components/CountStat";
import { SupplyFlow } from "../components/SupplyFlow";
import { LedgerTicker } from "../components/LedgerTicker";
import { JourneyMap } from "../components/JourneyMap";
import { BoxIcon, ChevronIcon, CrossIcon, DownloadIcon, PlusIcon, ShieldIcon } from "../components/icons";

const mintSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  quantity: z.coerce.number().int().min(1).max(500, "Quantity must be 1–500"),
  route: z.string().min(1, "Route is required"),
});
type MintForm = z.output<typeof mintSchema>;
// ponytail: zod v4 coerce widens the resolver input type to `unknown`; the runtime
// validation is unchanged, so the cast is safe.
const mintResolver = zodResolver(mintSchema) as unknown as Resolver<MintForm>;

interface TrailBlock {
  action: string;
  who: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  flags: string[];
  timestamp: number;
}
interface Trail {
  product: {
    serial: string; name: string; batchCode: string; route: string;
    state: string; recalled: boolean; mintedAt: number | null;
  };
  chainValid: boolean;
  journey: TrailBlock[];
}

function whereOf(b: TrailBlock): string {
  if (b.location && b.lat != null && b.lng != null) return `${b.location} (${b.lat.toFixed(4)}, ${b.lng.toFixed(4)})`;
  if (b.location) return b.location;
  if (b.lat != null && b.lng != null) return `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`;
  return "—";
}

export function Manufacturer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [trail, setTrail] = useState<Trail | null>(null);
  const { t } = useI18n();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MintForm>({
    resolver: mintResolver,
    defaultValues: { name: "Paracetamol 500mg", quantity: 5, route: "Delhi" },
  });

  async function load() {
    const { data } = await api.get("/batches");
    setBatches(data);
    setSelected((s) => (s ? data.find((b: Batch) => b.id === s.id) ?? null : null));
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  async function create(values: MintForm) {
    try {
      await api.post("/batches", values);
      toast.success(t("mfr.requestSent"));
      reset({ name: "", quantity: 5, route: "Delhi" });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Mint failed — try logging out and back in.");
    }
  }

  async function recall(batch: Batch) {
    if (!window.confirm(t("mfr.recallConfirm"))) return;
    try {
      const { data } = await api.post(`/batches/${batch.id}/recall`);
      const email = data.notified?.[0];
      toast.success(`${t("mfr.recallSent")} Email ${email?.status ?? "queued"} to ${email?.to ?? "mock recipient"}.`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Recall failed");
    }
  }

  async function openTrail(serial: string) {
    setTrail(null);
    try {
      const { data } = await api.get(`/ledger/product/${serial}`);
      setTrail(data);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Could not load pack trail");
    }
  }

  const totalPacks = batches.reduce((n, b) => n + b.products.length, 0);
  const activeBatches = batches.filter((b) => !b.recalled).length;

  return (
    <>
      <div className="page-header">
        <h1>{t("mfr.title")}</h1>
        <p className="muted">{t("mfr.subtitle")}</p>
      </div>

      <div className="stats">
        <CountStat value={batches.length} label={t("mfr.batches")} icon={<BoxIcon />} />
        <CountStat value={totalPacks} label="Packs" icon={<ShieldIcon />} />
        <CountStat value={activeBatches} label="Active" icon={<ChevronIcon size={18} />} className="accent-green" />
      </div>

      <div className="feature-grid">
        <div className="card"><SupplyFlow batches={batches} /></div>
        <div className="card"><LedgerTicker /></div>
      </div>

      <div className="card">
        <h2>{t("mfr.mintTitle")}</h2>
        <form onSubmit={handleSubmit(create)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 1rem" }}>
            <div className="field"><label>{t("mfr.medName")}</label><input {...register("name")} /></div>
            <div className="field"><label>{t("mfr.quantity")}</label><input type="number" min={1} {...register("quantity")} /></div>
            <div className="field"><label>{t("mfr.route")}</label><input {...register("route")} /></div>
          </div>
          {errors.name && <p className="error">{errors.name.message}</p>}
          {errors.quantity && <p className="error">{errors.quantity.message}</p>}
          {errors.route && <p className="error">{errors.route.message}</p>}
          <button type="submit" className="btn"><PlusIcon /> {t("mfr.mint")}</button>
        </form>
      </div>

      <div className="group">
        <div className="group-title">{t("mfr.batches")} ({batches.length})</div>
        {batches.length === 0 && <div className="row"><div className="row-main"><div className="row-sub">{t("mfr.noBatches")}</div></div></div>}
        {batches.map((b) => (
          <div key={b.id} className="row">
            <span className="stat-icon"><BoxIcon /></span>
            <div className="row-main clickable" onClick={() => setSelected(b)}>
              <div className="row-title">
                {b.name}{" "}
                {b.recalled && <span className="badge badge-danger">{t("mfr.recalled")}</span>}
                {b.status === "PENDING" && <span className="badge badge-warn">{t("mfr.pending")}</span>}
                {b.status === "REJECTED" && <span className="badge badge-danger">{t("mfr.rejectedBadge")}</span>}
              </div>
              <div className="row-sub">{b.code} · route {b.route} · {b.products.length} packs</div>
            </div>
            {b.status === "PENDING" && <span className="muted" style={{ fontSize: 12 }}>{t("mfr.awaitingApproval")}</span>}
            <button
              className="btn btn-ghost small"
              onClick={() => recall(b)}
              disabled={b.recalled || b.status !== "ACTIVE"}
            >
              {t("mfr.recall")}
            </button>
            <span className="chevron clickable" onClick={() => setSelected(b)}><ChevronIcon size={18} /></span>
          </div>
        ))}
      </div>

      {selected && selected.products.length > 0 && (
        <div className="card animate-in">
          <h2>Signed QRs — {selected.name} ({selected.code})</h2>
          <p className="muted">Scan with any phone camera / Google Lens — it opens the public Verify page. Pasting the text also works.</p>
          <div className="grid">
            {selected.products.map((p) => (
              <div key={p.id} className="qr-cell clickable" onClick={() => openTrail(p.serial)} title="View custody trail">
                <div id={`qr-${p.id}`}>
                  <QRCodeCanvas value={verifyUrl(p.qr)} size={160} includeMargin />
                </div>
                <StatusBadge state={p.state} />
                <span className="serial">{p.serial}</span>
                <button
                  className="btn btn-ghost small"
                  onClick={(e) => {
                    e.stopPropagation();
                    const c = document.getElementById(`qr-${p.id}`)?.querySelector("canvas") as HTMLCanvasElement | null;
                    const a = document.createElement("a");
                    a.href = c ? c.toDataURL("image/png") : "";
                    a.download = `${p.serial}.png`;
                    a.click();
                  }}
                >
                  <DownloadIcon /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && selected.products.length === 0 && (
        <div className="card animate-in">
          <h2>{selected.name} ({selected.code})</h2>
          <p className="muted">
            {selected.status === "PENDING" ? t("mfr.noQrsPending") : t("mfr.noQrsRejected")}
          </p>
        </div>
      )}

      {trail && (
        <div className="card animate-in">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <h2 style={{ margin: 0, flex: 1, minWidth: 0 }}>
              {trail.product.name} · <span className="serial" style={{ fontSize: 13 }}>{trail.product.serial}</span>
            </h2>
            <StatusBadge state={trail.product.state} />
            {trail.chainValid
              ? <span className="badge GENUINE">chain intact</span>
              : <span className="badge COUNTERFEIT">chain broken</span>}
            <button className="icon-btn" onClick={() => setTrail(null)} aria-label="Close pack trail"><CrossIcon /></button>
          </div>

          <JourneyMap
            journey={trail.journey.map((b) => ({
              action: b.action,
              signer: b.who,
              payload: { location: b.location ?? "", lat: b.lat ?? undefined, lng: b.lng ?? undefined },
              timestamp: b.timestamp,
            }))}
          />

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Event</th><th>By</th><th>Where</th><th>When</th></tr>
              </thead>
              <tbody>
                {trail.journey.map((b, i) => (
                  <tr key={i}>
                    <td data-label="Event"><span className={`badge badge-mini ${b.flags.length ? "danger" : ""}`}>{b.action}</span></td>
                    <td data-label="By">{b.who}</td>
                    <td data-label="Where">{whereOf(b)}</td>
                    <td data-label="When">{new Date(b.timestamp * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption" style={{ marginTop: "0.6rem" }}>
            Route: {trail.product.route} · Click any QR above to inspect its pack trail.
          </p>
        </div>
      )}
    </>
  );
}
