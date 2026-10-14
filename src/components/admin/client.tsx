"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Menu, X } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  group?: string;
  badge?: number;
}

export function AdminNav({ items, footer }: { items: NavItem[]; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(items.map((i) => i.group ?? "")));
  // item ativo = prefixo mais longo que corresponde à rota
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const nav = (
    <nav aria-label="Painel" className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {groups.map((g) => (
        <div key={g}>
          {g && <p className="mb-2 px-3 font-tech text-[0.7rem] uppercase tracking-[0.2em] text-silver-dim">{g}</p>}
          <ul className="space-y-0.5">
            {items
              .filter((i) => (i.group ?? "") === g)
              .map((i) => {
                const active = i.href === activeHref;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={clsx("flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium", active ? "bg-orange/15 text-orange" : "text-silver hover:bg-white/5 hover:text-paper")}
                    >
                      {i.label}
                      {!!i.badge && <span className="rounded-full bg-orange px-1.5 text-[0.7rem] font-bold text-ink">{i.badge}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      <div className="mt-auto">{footer}</div>
    </nav>
  );
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu do painel" className="fixed right-3 top-3 z-50 inline-flex size-10 items-center justify-center rounded-md border border-white/10 bg-ink lg:hidden">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <aside className={clsx("fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.06] bg-ink transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>{nav}</aside>
    </>
  );
}

export function SubmitButton({ children, variant = "primary", confirm, className, ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50",
        variant === "primary" && "bg-orange text-ink hover:bg-orange-hot",
        variant === "secondary" && "border border-white/15 hover:border-orange",
        variant === "danger" && "border border-danger/50 text-[#ff9ea1] hover:bg-danger/15",
        className,
      )}
      {...props}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
