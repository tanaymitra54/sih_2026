import { useMemo } from "react";

const COLORS = ["#ff671f", "#046a38", "#0071e3", "#ffd60a", "#34c759"];

export function Confetti({ count = 48 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.4 + Math.random() * 1.4,
        size: 5 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 720 - 360,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
