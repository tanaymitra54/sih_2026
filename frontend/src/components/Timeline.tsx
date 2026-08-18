import type { JourneyItem } from "../types";

function ActionIcon({ action }: { action: string }) {
  const a = action.toLowerCase();
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  switch (a) {
    case "mint":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 12l9 5 9-5" />
        </svg>
      );
    case "receive":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case "verify":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M6 6l15 4 2 7H8z" />
          <path d="M6 10H3v7h3" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      );
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
