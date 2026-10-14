import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function AdminPage({ title, description, actions, children, back }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {back && (
        <Link href={back.href} className="mb-3 inline-block text-sm text-silver-dim hover:text-orange">
          ← {back.label}
        </Link>
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-sm text-silver-dim">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx("rounded-[12px] border border-white/[0.08] bg-ink-2", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href, tone = "default" }: { label: string; value: number | string; href?: string; tone?: "default" | "warning" | "success" }) {
  const body = (
    <div className={clsx("rounded-[12px] border bg-ink-2 p-5 transition-colors", tone === "warning" ? "border-warning/30" : tone === "success" ? "border-success/30" : "border-white/[0.08]", href && "hover:border-orange/60")}>
      <p className="font-tech text-xs uppercase tracking-widest text-silver-dim">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-white/[0.08]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.03] font-tech text-xs uppercase tracking-widest text-silver-dim">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-silver-dim">Nenhum registro encontrado.</p>}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={clsx("px-4 py-3 align-top", className)}>{children}</td>;
}

export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (!msg && !error) return null;
  return (
    <div role="status" className={clsx("mb-6 rounded-[10px] border px-4 py-3 text-sm", error ? "border-danger/40 bg-danger/10 text-[#ffb3b5]" : "border-success/40 bg-success/10 text-[#9be3c1]")}>
      {error ?? msg}
    </div>
  );
}

export function Filters({ options, current, param, base }: { options: Array<{ value: string; label: string }>; current?: string; param: string; base: string }) {
  return (
    <nav aria-label="Filtros" className="mb-5 flex flex-wrap gap-2">
      {[{ value: "", label: "Todos" }, ...options].map((o) => {
        const active = (current ?? "") === o.value;
        return (
          <Link
            key={o.value}
            href={o.value ? `${base}?${param}=${o.value}` : base}
            aria-current={active ? "page" : undefined}
            className={clsx("rounded-full border px-3 py-1.5 text-xs font-semibold", active ? "border-orange bg-orange text-ink" : "border-white/15 text-silver hover:border-orange/60")}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const inputCls = "field !min-h-10 !py-2 text-sm";
export const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wider text-silver-dim";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

export function Item({ k, v, wide }: { k: string; v: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-silver-dim">{k}</dt>
      <dd className="mt-0.5 whitespace-pre-line">{v}</dd>
    </div>
  );
}
