interface IconProps {
  size?: number;
  className?: string;
}

function base(size = 20, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function ShieldIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function SunIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function HomeIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function ScanIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function BellIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function LogoutIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function CameraIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14.5 4H9.5L7.5 6.5H4A2 2 0 0 0 2 8.5v9A2 2 0 0 0 4 19.5h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-3.5L14.5 4z" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  );
}

export function ChevronIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.4}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.6}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function WarnIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function CrossIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.6}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function CartIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l15 4 2 7H8z" />
      <path d="M6 10H3v7h3" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

export function PackageIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 12l9 5 9-5" />
    </svg>
  );
}

export function TruckIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M1 5h13v12H1z" />
      <path d="M14 9h5l4 4v4h-9" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
    </svg>
  );
}

export function StoreIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 9h16l-1 11H5L4 9z" />
      <path d="M3 4h18" />
      <path d="M9 9v3a3 3 0 0 0 6 0V9" />
    </svg>
  );
}

export function FactoryIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 20h20" />
      <path d="M4 20V8l6 4V8l6 4V8l4-2v14" />
    </svg>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function DownloadIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function ArrowRightIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BoxIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l8 4v10l-8 4-8-4V7l8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </svg>
  );
}

export function AlertIcon({ size, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
