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
import { BoxIcon, ChevronIcon, DownloadIcon, PlusIcon, ShieldIcon } from "../components/icons";

const mintSchema = z.object({
  name: z.string().min(1, "Medicine name is required"),
  quantity: z.coerce.number().int().min(1).max(500, "Quantity must be 1–500"),
  route: z.string().min(1, "Route is required"),
});
type MintForm = z.output<typeof mintSchema>;
// ponytail: zod v4 coerce widens the resolver input type to `unknown`; the runtime
// validation is unchanged, so the cast is safe.
const mintResolver = zodResolver(mintSchema) as unknown as Resolver<MintForm>;

export function Manufacturer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
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
      toast.success("Batch minted — each pack got a signed QR.");
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
      toast.success(`${t("mfr.recallSent")} (${data.notified.length} notified)`);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Recall failed");
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
              <div className="row-title">{b.name} {b.recalled && <span className="badge badge-danger">{t("mfr.recalled")}</span>}</div>
              <div className="row-sub">{b.code} · route {b.route} · {b.products.length} packs</div>
            </div>
            <button className="btn btn-ghost small" onClick={() => recall(b)} disabled={b.recalled}>
              {t("mfr.recall")}
            </button>
            <span className="chevron clickable" onClick={() => setSelected(b)}><ChevronIcon size={18} /></span>
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
                  <DownloadIcon /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
