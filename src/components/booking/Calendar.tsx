"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DayAvailability } from "@/lib/availability";

type DayStatus = "available" | "full" | "closed" | "holiday" | "past" | "too_far";
interface MonthData {
  timezone: string;
  maxDaysAhead: number;
  days: Array<{ date: string; status: DayStatus; free: number; holidayName?: string }>;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const STATUS_TEXT: Record<DayStatus, string> = {
  available: "horários disponíveis",
  full: "lotado",
  closed: "fechado",
  holiday: "feriado",
  past: "indisponível",
  too_far: "agenda ainda não aberta",
};

function monthOf(date: string) {
  return date.slice(0, 7);
}
function shiftMonth(month: string, d: number) {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Calendário + lista de horários reais (consulta /api/disponibilidade). */
export function SlotPicker({
  bookingTypeId,
  value,
  onChange,
  today,
  refreshKey = 0,
}: {
  bookingTypeId: string;
  value: { date: string; time: string } | null;
  onChange: (v: { date: string; time: string } | null) => void;
  today: string;
  refreshKey?: number;
}) {
  const [month, setMonth] = useState(monthOf(value?.date ?? today));
  const [data, setData] = useState<MonthData | null>(null);
  const [day, setDay] = useState<DayAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(value?.date ?? null);
  const [loading, setLoading] = useState<"month" | "day" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMonth = useCallback(async () => {
    setLoading("month");
    setError(null);
    try {
      const res = await fetch(`/api/disponibilidade?tipo=${bookingTypeId}&mes=${month}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(null);
    }
  }, [bookingTypeId, month]);

  const loadDay = useCallback(
    async (date: string) => {
      setLoading("day");
      try {
        const res = await fetch(`/api/disponibilidade?tipo=${bookingTypeId}&data=${date}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json()).error);
        setDay(await res.json());
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Não foi possível carregar os horários.");
      } finally {
        setLoading(null);
      }
    },
    [bookingTypeId],
  );

  useEffect(() => {
    void loadMonth();
  }, [loadMonth, refreshKey]);

  useEffect(() => {
    if (selectedDate) void loadDay(selectedDate);
  }, [selectedDate, loadDay, refreshKey]);

  const lastAllowed = data?.days.find((d) => d.status === "too_far")?.date;
  const canPrev = month > monthOf(today);
  const canNext = !lastAllowed || month < monthOf(lastAllowed);

  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

  const pickDate = (date: string) => {
    setSelectedDate(date);
    setDay(null);
    onChange(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior" className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 hover:border-orange disabled:opacity-30">
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-heading text-xl font-bold capitalize" aria-live="polite">
            {MONTHS[m - 1]} {y}
          </p>
          <button type="button" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês" className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 hover:border-orange disabled:opacity-30">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-tech text-xs uppercase tracking-wider text-silver-dim" aria-hidden>
          {WEEK.map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>
        <div role="grid" aria-label="Escolha a data" className={clsx("mt-1 grid grid-cols-7 gap-1", loading === "month" && "opacity-50")}>
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {(data?.days ?? []).map((d) => {
            const n = Number(d.date.slice(8));
            const selected = d.date === selectedDate;
            const enabled = d.status === "available";
            const wd = new Date(`${d.date}T12:00:00Z`).getUTCDay();
            return (
              <button
                key={d.date}
                type="button"
                role="gridcell"
                disabled={!enabled && d.status !== "full"}
                aria-selected={selected}
                aria-label={`${n} de ${MONTHS[m - 1]}, ${WEEK_FULL[wd]}: ${d.holidayName ?? STATUS_TEXT[d.status]}${enabled ? ` (${d.free})` : ""}`}
                onClick={() => pickDate(d.date)}
                className={clsx(
                  "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-[10px] text-[0.98rem] font-semibold transition-colors",
                  selected && "bg-orange text-ink",
                  !selected && enabled && "bg-white/[0.04] text-paper hover:bg-orange/20",
                  !selected && d.status === "full" && "bg-white/[0.02] text-silver-dim line-through",
                  !enabled && d.status !== "full" && "text-silver-dim/40",
                  d.date === today && !selected && "ring-1 ring-orange/60",
                )}
              >
                {n}
                {enabled && !selected && <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-success" />}
                {d.status === "holiday" && <span aria-hidden className="absolute bottom-1.5 size-1 rounded-full bg-warning" />}
              </button>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-silver-dim">
          <li className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" /> Com horários</li>
          <li className="flex items-center gap-1.5"><span className="line-through">12</span> Lotado</li>
          <li className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-warning" /> Feriado</li>
          <li className="flex items-center gap-1.5"><span className="opacity-40">12</span> Fechado / indisponível</li>
        </ul>
      </div>

      <div className="panel p-4 md:p-6" aria-live="polite">
        {error && <p role="alert" className="mb-3 text-sm text-[#ff8f92]">{error}</p>}
        {!selectedDate ? (
          <p className="flex h-full items-center justify-center py-10 text-center text-silver">Escolha uma data no calendário para ver os horários disponíveis.</p>
        ) : loading === "day" || !day ? (
          <p className="flex items-center justify-center gap-2 py-10 text-silver"><Loader2 className="size-5 animate-spin" /> Carregando horários…</p>
        ) : !day.open || day.slots.length === 0 ? (
          <p className="py-10 text-center text-silver">Não há atendimento nesta data. Escolha outro dia.</p>
        ) : (
          <>
            <p className="font-heading text-lg font-bold">
              {new Date(`${day.date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })}
            </p>
            <div role="radiogroup" aria-label="Horários" className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {day.slots
                .filter((s) => s.reason !== "too_soon")
                .map((s) => {
                  const selected = value?.date === day.date && value.time === s.time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!s.available}
                      onClick={() => onChange({ date: day.date, time: s.time })}
                      className={clsx(
                        "min-h-12 rounded-[10px] border font-tech text-lg font-semibold tracking-wide transition-colors",
                        selected && "border-orange bg-orange text-ink",
                        !selected && s.available && "border-white/15 hover:border-orange hover:bg-orange/10",
                        !s.available && "cursor-not-allowed border-transparent bg-white/[0.02] text-silver-dim/50 line-through",
                      )}
                      title={!s.available ? (s.reason === "booked" ? "Reservado" : "Indisponível") : undefined}
                    >
                      {s.time}
                    </button>
                  );
                })}
            </div>
            {day.slots.every((s) => !s.available) && <p className="mt-4 text-sm text-silver">Todos os horários deste dia já foram reservados.</p>}
            <p className="mt-4 text-xs text-silver-dim">Horários riscados já estão reservados ou indisponíveis.</p>
          </>
        )}
      </div>
    </div>
  );
}
