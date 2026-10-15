"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { DayAvailability } from "@/lib/availability";

interface DayInfo {
  date: string;
  status: "available" | "full" | "closed" | "holiday" | "past" | "too_far";
  free: number;
  holidayName?: string;
}

const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
const wd = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();

/** Calendário real na página inicial: próximos dias com vagas e horários livres. */
export function AgendaShowcase({ bookingTypeId, bookingTypeName, today }: { bookingTypeId: string | null; bookingTypeName: string; today: string }) {
  const [days, setDays] = useState<DayInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [day, setDay] = useState<DayAvailability | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState(false);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookingTypeId) return;
    const m1 = today.slice(0, 7);
    Promise.all(
      [m1, nextMonth(m1)].map((m) =>
        fetch(`/api/disponibilidade?tipo=${bookingTypeId}&mes=${m}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      ),
    )
      .then((months: Array<{ days: DayInfo[] }>) => {
        const list = months.flatMap((m) => m.days).filter((d) => d.date >= today && d.status !== "too_far").slice(0, 21);
        setDays(list);
        const first = list.find((d) => d.status === "available");
        if (first) setSelected(first.date);
      })
      .catch(() => setError(true));
  }, [bookingTypeId, today]);

  useEffect(() => {
    if (!selected || !bookingTypeId) return;
    setLoadingDay(true);
    setTime(null);
    fetch(`/api/disponibilidade?tipo=${bookingTypeId}&data=${selected}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DayAvailability) => setDay(d))
      .catch(() => setError(true))
      .finally(() => setLoadingDay(false));
  }, [selected, bookingTypeId]);

  const firstFree = useMemo(() => days?.find((d) => d.status === "available"), [days]);
  const slots = (day?.slots ?? []).filter((s) => s.reason !== "too_soon");
  const scrollStrip = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: "smooth" });
  const href = selected && time ? `/agendamento?tipo=${bookingTypeId}&modalidade=oficina&data=${selected}&hora=${time}` : "/agendamento";
  const selDate = selected ? new Date(`${selected}T12:00:00Z`) : null;

  return (
    <section id="agenda" aria-labelledby="agenda-titulo" className="relative overflow-hidden py-20 md:py-28">
      <span aria-hidden className="watermark -top-4 right-[-2vw]">AGENDA</span>
      <div className="container-ds relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <Reveal className="min-w-0">
          <p className="eyebrow mb-4 flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-orange" /> Agendamento online
          </p>
          <h2 id="agenda-titulo" className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-[1.03]">
            Escolha o dia. <span className="text-hot">Nós cuidamos da direção.</span>
          </h2>
          <p className="mt-5 max-w-lg text-[1.05rem] text-silver">
            A agenda abaixo é real: você vê só os horários livres e reserva em poucos toques. Depois, acompanha tudo pelo protocolo.
          </p>
          {firstFree && (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-success/30 bg-success/10 py-2 pl-3 pr-4 text-sm text-[#9be3c1]">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              Próxima data livre: <strong className="font-semibold text-paper">{firstFree.date === today ? "hoje" : `${WEEK[wd(firstFree.date)].toLowerCase()}, ${firstFree.date.slice(8)}/${firstFree.date.slice(5, 7)}`}</strong>
            </p>
          )}
          <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
            <Link href="/agendamento" className={buttonClass("primary", "lg", "btn-float")}>
              <CalendarDays className="size-5" aria-hidden /> Agendar atendimento
            </Link>
            <Link href="/visita" className={buttonClass("secondary", "lg", "btn-float")}>
              <MapPin className="size-5" aria-hidden /> Solicitar visita
            </Link>
            <Link href="/acompanhar" className={buttonClass("ghost", "md", "btn-float")}>
              <Search className="size-4" aria-hidden /> Acompanhar
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120} className="min-w-0">
          <div className="relative overflow-hidden rounded-[20px] border border-orange/25 bg-gradient-to-br from-graphite/95 via-ink-2/95 to-ink/95 shadow-[0_30px_80px_-30px_rgb(244_119_18/0.45)] backdrop-blur">
            <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full bg-orange/15 blur-3xl" />
            {/* cabeçalho do calendário */}
            <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 md:px-6">
              <div>
                <p className="font-tech text-xs uppercase tracking-[0.25em] text-silver-dim">{bookingTypeName}</p>
                <p className="font-heading text-xl font-bold capitalize">
                  {selDate ? `${MONTHS[selDate.getUTCMonth()]} ${selDate.getUTCFullYear()}` : "Agenda"}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" aria-label="Dias anteriores" onClick={() => scrollStrip(-1)} className="btn-press relative inline-flex size-11 items-center justify-center overflow-hidden rounded-full border border-white/10 hover:border-orange">
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" aria-label="Próximos dias" onClick={() => scrollStrip(1)} className="btn-press relative inline-flex size-11 items-center justify-center overflow-hidden rounded-full border border-white/10 hover:border-orange">
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

            {/* faixa de dias */}
            <div ref={strip} role="listbox" aria-label="Escolha o dia" className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
              {!days && !error &&
                Array.from({ length: 7 }, (_, i) => <div key={i} className="h-[84px] w-[64px] shrink-0 animate-pulse rounded-[14px] bg-white/[0.04]" />)}
              {days?.map((d) => {
                const on = d.date === selected;
                const ok = d.status === "available";
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!ok && d.status !== "full"}
                    onClick={() => setSelected(d.date)}
                    aria-label={`${WEEK[wd(d.date)]} ${d.date.slice(8)}: ${ok ? `${d.free} horários` : d.status === "full" ? "lotado" : d.holidayName ?? "sem atendimento"}`}
                    className={clsx(
                      "btn-press relative flex h-[84px] w-[64px] shrink-0 snap-start flex-col items-center justify-center overflow-hidden rounded-[14px] border transition-colors",
                      on && "border-orange bg-orange text-ink shadow-[0_10px_30px_-8px_rgb(244_119_18/0.8)]",
                      !on && ok && "border-white/10 bg-white/[0.04] hover:border-orange/60",
                      !on && d.status === "full" && "border-white/5 text-silver-dim line-through",
                      !on && !ok && d.status !== "full" && "border-transparent text-silver-dim/35",
                    )}
                  >
                    <span className="font-tech text-[0.7rem] tracking-[0.18em]">{WEEK[wd(d.date)]}</span>
                    <span className="font-display text-2xl leading-none">{d.date.slice(8)}</span>
                    <span className={clsx("mt-1.5 h-1 w-5 rounded-full", on ? "bg-ink/40" : ok ? "bg-success" : d.status === "holiday" ? "bg-warning" : "bg-transparent")} />
                  </button>
                );
              })}
            </div>

            {/* horários */}
            <div className="relative min-h-[196px] border-t border-white/[0.07] px-4 py-5 md:px-6" aria-live="polite">
              {error ? (
                <p className="py-8 text-center text-silver">Não foi possível carregar a agenda agora. Use o botão abaixo para agendar.</p>
              ) : !bookingTypeId ? (
                <p className="py-8 text-center text-silver">A agenda online ainda não foi configurada.</p>
              ) : loadingDay || !day ? (
                <p className="flex items-center justify-center gap-2 py-12 text-silver"><Loader2 className="size-5 animate-spin" /> Carregando horários…</p>
              ) : slots.length === 0 || slots.every((s) => !s.available) ? (
                <p className="py-10 text-center text-silver">Este dia está lotado. Escolha outra data.</p>
              ) : (
                <>
                  <p className="mb-3 flex items-center gap-2 font-tech text-xs uppercase tracking-[0.2em] text-silver-dim">
                    <Clock className="size-3.5" aria-hidden /> Horários livres
                  </p>
                  <div role="radiogroup" aria-label="Horários" className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.slice(0, 15).map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        role="radio"
                        aria-checked={time === s.time}
                        disabled={!s.available}
                        onClick={() => setTime(s.time)}
                        className={clsx(
                          "btn-press relative min-h-11 overflow-hidden rounded-[10px] border font-tech text-[1.05rem] font-semibold tracking-wide",
                          time === s.time && "border-orange bg-orange text-ink",
                          time !== s.time && s.available && "border-white/12 bg-white/[0.03] hover:border-orange",
                          !s.available && "cursor-not-allowed border-transparent text-silver-dim/40 line-through",
                        )}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ação */}
            <div className="relative border-t border-white/[0.07] p-4 md:px-6">
              <Link href={href} className={buttonClass("primary", "lg", clsx("w-full", time && "animate-pulse-glow"))}>
                {time && selected ? (
                  <>
                    Agendar {selected.slice(8)}/{selected.slice(5, 7)} às {time} <ArrowRight className="size-5" aria-hidden />
                  </>
                ) : (
                  <>
                    <CalendarDays className="size-5" aria-hidden /> {selected ? "Escolha um horário" : "Agendar atendimento"}
                  </>
                )}
              </Link>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
                <Link href="/visita" className={buttonClass("secondary", "md", "btn-float")}>
                  <MapPin className="size-4" aria-hidden /> Visita
                </Link>
                <Link href="/acompanhar" className={buttonClass("secondary", "md", "btn-float")}>
                  <Search className="size-4" aria-hidden /> Acompanhar
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
