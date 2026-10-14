import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel DS Hidráulica" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#0d0d0f]">{children}</div>;
}
