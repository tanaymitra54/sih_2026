import type { JourneyItem } from "../types";
import { BoxIcon, CartIcon, CheckIcon, ScanIcon } from "./icons";

function ActionIcon({ action }: { action: string }) {
  const a = action.toLowerCase();
  switch (a) {
    case "mint":
      return <BoxIcon size={18} />;
    case "receive":
      return <ScanIcon size={18} />;
    case "verify":
      return <CheckIcon size={18} />;
    default:
      return <CartIcon size={18} />;
  }
}

export function Timeline({ journey }: { journey: JourneyItem[] }) {
  if (journey.length === 0) return <p className="muted">No custody records found.</p>;
  return (
    <ul className="timeline">
      {journey.map((j, i) => (
        <li key={i}>
          <span className={`tl-node ${j.action.toLowerCase()}`}>
            <ActionIcon action={j.action} />
          </span>
          <div className="tl-body">
            <div className="tl-title">{j.action}</div>
            <div className="tl-meta">by {j.signer} · {new Date(j.timestamp * 1000).toLocaleString()}</div>
            {Boolean(j.payload.role) && <div className="tl-meta">via {String(j.payload.role)}</div>}
            {Boolean(j.payload.location) && <div className="tl-meta">at {String(j.payload.location)}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
