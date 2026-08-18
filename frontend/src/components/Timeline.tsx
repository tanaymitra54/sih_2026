import type { JourneyItem } from "../types";

export function Timeline({ journey }: { journey: JourneyItem[] }) {
  if (journey.length === 0) return <p className="muted">No custody records found.</p>;
  return (
    <ul className="timeline">
      {journey.map((j, i) => (
        <li key={i}>
          <strong>{j.action}</strong>{" "}
          <span className="muted">
            by {j.signer} · {new Date(j.timestamp * 1000).toLocaleString()}
          </span>
          {Boolean(j.payload.role) && <div className="muted">via {String(j.payload.role)}</div>}
          {Boolean(j.payload.location) && <div className="muted">at {String(j.payload.location)}</div>}
        </li>
      ))}
    </ul>
  );
}
