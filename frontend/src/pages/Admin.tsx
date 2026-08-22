import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Batch } from "../types";
import { CountStat } from "../components/CountStat";
import { BoxIcon, CheckIcon, CrossIcon, ShieldIcon } from "../components/icons";

interface PendingBatch extends Batch {
  manufacturer: { name: string };
}

export function Admin() {
  const [pending, setPending] = useState<PendingBatch[]>([]);
  const [processed, setProcessed] = useState<Batch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { t } = useI18n();

  async function load() {
    try {
      const [p, all] = await Promise.all([
        api.get("/batches/pending"),
        api.get("/batches/all"),
      ]);
      setPending(p.data);
      setProcessed(all.data.filter((b: Batch) => b.status !== "PENDING").slice(0, 10));
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  async function decide(batch: PendingBatch, action: "approve" | "reject") {
    setBusy(batch.id + action);
    try {
      if (action === "approve") {
        const { data } = await api.post(`/batches/${batch.id}/approve`);
        toast.success(`${t("adm.approvedToast")} ${batch.code} — ${data.productsMinted} ${t("adm.mintedCount")}`);
      } else {
        await api.post(`/batches/${batch.id}/reject`);
        toast.success(`${t("adm.rejectedToast")} ${batch.code}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? `${t("adm.decideFailed")} ${batch.code}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>{t("adm.title")}</h1>
        <p className="muted">{t("adm.subtitle")}</p>
      </div>

      <div className="stats">
        <CountStat value={pending.length} label={t("adm.pendingStat")} icon={<BoxIcon />} />
        <CountStat
          value={processed.filter((b) => b.status === "ACTIVE").length}
          label={t("adm.approvedStat")}
          icon={<CheckIcon />}
          className="accent-green"
        />
        <CountStat
          value={processed.filter((b) => b.status === "REJECTED").length}
          label={t("adm.rejectedStat")}
          icon={<CrossIcon />}
        />
      </div>

      <div className="group">
        <div className="group-title">{t("adm.queueTitle")} ({pending.length})</div>
        {pending.length === 0 && (
          <div className="row"><div className="row-main"><div className="row-sub">{t("adm.noPending")}</div></div></div>
        )}
        {pending.map((b) => (
          <div key={b.id} className="row">
            <span className="stat-icon"><BoxIcon /></span>
            <div className="row-main">
              <div className="row-title">{b.name}</div>
              <div className="row-sub">
                {b.code} · {t("adm.by")} {b.manufacturer.name} · {b.quantity} {t("adm.packs")} · {t("mfr.route")} {b.route} · {new Date(b.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              className="btn btn-green small"
              disabled={busy !== null}
              onClick={() => decide(b, "approve")}
            >
              <CheckIcon /> {t("adm.approve")}
            </button>
            <button
              className="btn btn-ghost small"
              disabled={busy !== null}
              onClick={() => decide(b, "reject")}
            >
              <CrossIcon /> {t("adm.reject")}
            </button>
          </div>
        ))}
      </div>

      {processed.length > 0 && (
        <div className="group">
          <div className="group-title">{t("adm.recentTitle")}</div>
          {processed.map((b) => (
            <div key={b.id} className="row">
              <span className="stat-icon"><ShieldIcon /></span>
              <div className="row-main">
                <div className="row-title">{b.name}</div>
                <div className="row-sub">{b.code} · {b.quantity} {t("adm.packs")}</div>
              </div>
              <StatusChip status={b.status ?? ""} t={t} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusChip({ status, t }: { status: string; t: (k: string) => string }) {
  const cls = status === "ACTIVE" ? "badge" : status === "REJECTED" ? "badge badge-danger" : "badge badge-warn";
  return <span className={cls}>{status === "ACTIVE" ? t("adm.activeBadge") : status === "REJECTED" ? t("adm.rejectedBadge") : status}</span>;
}
