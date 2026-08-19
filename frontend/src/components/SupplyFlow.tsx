import { useI18n } from "../i18n";
import type { Batch } from "../types";

const STAGES = ["CREATED", "DISTRIBUTED", "AT_PHARMACY", "SOLD"] as const;
const STAGE_LABEL: Record<string, string> = {
  CREATED: "Mint",
  DISTRIBUTED: "Distributor",
  AT_PHARMACY: "Pharmacy",
  SOLD: "Consumer",
};

/** Animated supply-chain pipeline: product counts move through each custody stage. */
export function SupplyFlow({ batches }: { batches: Batch[] }) {
  const { t } = useI18n();
  const counts = STAGES.map((s) =>
    batches.reduce((n, b) => n + b.products.filter((p) => p.state === s).length, 0),
  );
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="card">
      <h2>{t("mfr.supplyFlow")}</h2>
      <div className="flow">
        <div className="flow-track">
          <span className="flow-dot" />
          {STAGES.map((s, i) => (
            <div key={s} className="flow-stage" style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}>
              <span className="flow-node" />
              <span className="flow-label">{STAGE_LABEL[s]}</span>
              <span className="flow-count">{counts[i]}</span>
            </div>
          ))}
        </div>
        <div className="flow-bar">
          {STAGES.map((s, i) => (
            <div
              key={s}
              className={`flow-seg flow-seg-${i}`}
              style={{ width: `${(counts[i] / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
