import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";

interface Block {
  index: number;
  blockHash: string;
  action: string;
  signer: string;
  timestamp: number;
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
            <span className={`badge badge-mini ${ACTION_COLOR[b.action] ?? ""}`}>{b.action}</span>
            <span className="ticker-signer">{b.signer}</span>
            <span className="ticker-time">{new Date(b.timestamp * 1000).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
