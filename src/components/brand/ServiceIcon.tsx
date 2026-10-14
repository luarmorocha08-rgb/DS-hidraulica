import { Cog, Droplet, Gauge, Link2, Search, ShieldCheck, Truck, Wrench } from "lucide-react";

/** Ícones técnicos desenhados para os componentes de direção. */
function SteeringGear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="10" width="17" height="10" rx="2.5" />
      <path d="M21 13h5M21 17h5M26 12v6" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 20v6M9 26h6M4 15H1.5" />
    </svg>
  );
}

function Pump({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="13" cy="17" r="8" />
      <circle cx="13" cy="17" r="3" />
      <path d="M21 17h6M24 14v6M13 9V4h6M13 4h-3" />
    </svg>
  );
}

function Hose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 8h5c6 0 6 16 12 16h5" />
      <rect x="1.5" y="5.5" width="4" height="5" rx="1" />
      <rect x="26.5" y="21.5" width="4" height="5" rx="1" />
    </svg>
  );
}

const MAP = {
  steering: SteeringGear,
  pump: Pump,
  hose: Hose,
  gauge: Gauge,
  search: Search,
  cog: Cog,
  shield: ShieldCheck,
  droplet: Droplet,
  truck: Truck,
  link: Link2,
  wrench: Wrench,
} as const;

export type ServiceIconName = keyof typeof MAP;
export const SERVICE_ICON_NAMES = Object.keys(MAP) as ServiceIconName[];

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name as ServiceIconName] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
