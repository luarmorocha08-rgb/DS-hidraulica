"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { CalendarDays, MapPin, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClass } from "@/components/ui/Button";
import { NAV_ITEMS } from "./nav";

export function Header({
  showTestimonials,
  whatsappHref,
  instagramUrl,
}: {
  showTestimonials: boolean;
  whatsappHref: string | null;
  instagramUrl: string;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [homeActive, setHomeActive] = useState("inicio");
  const active = isHome ? homeActive : pathname.startsWith("/agendamento") ? "agendamento" : "";

  const items = NAV_ITEMS.filter((i) => i.id !== "depoimentos" || showTestimonials);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // indicador da seção ativa na página inicial
  useEffect(() => {
    if (!isHome) return;
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setHomeActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome, pathname, showTestimonials]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || !isHome || open;

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500",
        solid
          ? "border-b border-white/[0.06] bg-graphite/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-gradient-to-b from-black/60 to-transparent",
      )}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-orange focus:px-3 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <div className="container-ds flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="DS Hidráulica — página inicial" className="shrink-0">
          <Logo className="h-12 w-auto md:h-14" />
        </Link>

        <nav aria-label="Principal" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? (item.id === "agendamento" && !isHome ? "page" : "location") : undefined}
                    className={clsx(
                      "relative px-3 py-2 font-heading text-[0.98rem] font-bold uppercase tracking-[0.06em] transition-colors",
                      isActive ? "text-paper" : "text-silver/80 hover:text-paper",
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className={clsx(
                        "absolute inset-x-3 -bottom-0.5 h-[2px] origin-left rounded-full bg-orange transition-transform duration-500 ease-[var(--ease-out-expo)]",
                        isActive ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Link href="/agendamento" className={buttonClass("primary", "sm")}>
              <CalendarDays className="size-4" aria-hidden />
              Agendar atendimento
            </Link>
          </span>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-paper xl:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        id="menu-mobile"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto bg-ink/97 backdrop-blur-xl xl:hidden"
      >
        <nav aria-label="Menu" className="container-ds flex min-h-full flex-col py-6">
          <ul className="divide-y divide-white/[0.06]">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex items-center justify-between py-4 font-heading text-2xl font-bold uppercase tracking-wide",
                    active === item.id ? "text-orange" : "text-paper",
                  )}
                >
                  {item.label}
                  <span aria-hidden className="text-silver-dim">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-3">
            <Link href="/agendamento" onClick={() => setOpen(false)} className={buttonClass("primary", "lg")}>
              <CalendarDays className="size-5" aria-hidden /> Agendar atendimento
            </Link>
            <Link href="/visita" onClick={() => setOpen(false)} className={buttonClass("secondary", "lg")}>
              <MapPin className="size-5" aria-hidden /> Solicitar visita ao local
            </Link>
            <Link href="/orcamento" onClick={() => setOpen(false)} className={buttonClass("ghost", "md")}>
              Pedir orçamento
            </Link>
          </div>
          <div className="mt-auto flex items-center gap-3 pt-10 text-silver">
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2">
                <WhatsAppIcon className="size-6 text-[#25d366]" /> WhatsApp
              </a>
            )}
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2">
              <InstagramIcon className="size-6" /> @ds.hidraulica
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
