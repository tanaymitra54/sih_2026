import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";

interface Block {
  index: number;
  blockHash: string;
  action: string;
  signer: string;
  timestamp: number;
  serial?: string;
  medicine?: string;
  batchCode?: string;
  recalled?: boolean;
  signerName?: string;
  location?: string;
}

const ACTION_COLOR: Record<string, string> = {
  MINT: "green",
  RECEIVE: "accent",
  VERIFY: "accent",
  SELL: "saffron",
  BUY: "saffron",
  RECALL: "danger",
};

export function LedgerTicker({ limit = 8 }: { limit?: number }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/ledger/recent", { params: { limit } });
        setBlocks(data);
      } catch {
        /* ignore */
      }
    };
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [limit]);

  if (blocks.length === 0) return <p className="muted">Loading ledger…</p>;

  return (
    <div className="ledger-ticker">
      <div className="ticker-head">
        <span className="pulse-dot" />
        <span>{t("mfr.liveLedger")}</span>
      </div>
      <div className="ticker-list">
        {blocks.map((b) => (
          <div key={b.blockHash} className="ticker-row">
            <div className="ticker-top">
              <span className={`badge badge-mini ${ACTION_COLOR[b.action] ?? ""}`}>{b.action}</span>
              <span className="ticker-medicine">
                {b.medicine}
                {b.recalled && <span className="badge badge-mini badge-danger">RECALLED</span>}
              </span>
              <span className="ticker-time">{new Date(b.timestamp * 1000).toLocaleTimeString()}</span>
            </div>
            <div className="ticker-sub" title={`${b.blockHash}`}>
              #{b.index} · {b.serial} · {b.batchCode} · {b.location || b.signerName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
