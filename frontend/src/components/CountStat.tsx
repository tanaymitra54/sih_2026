import type { ReactNode } from "react";
import { useCountUp } from "../utils/useCountUp";

/** Stat card whose number animates to its target (and keeps it current). */
export function CountStat({ value, label, icon, className = "" }: {
  value: number;
  label: string;
  icon: ReactNode;
  className?: string;
}) {
  const n = useCountUp(value);
  return (
    <div className={`stat ${className}`}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{n}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
