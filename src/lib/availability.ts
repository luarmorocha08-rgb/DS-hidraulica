/**
 * Cálculo de horários disponíveis — função pura, sem acesso a banco.
 * Ver docs/ARQUITETURA.md §4.
 */
import { addDays, daysBetween, minutesToTime, timeToMinutes, todayIn, weekdayOf, zonedToUtc } from "./time";

export interface Interval {
  start: Date;
  end: Date;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface ScheduleRules {
  timezone: string;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  capacity: number;
  minLeadHours: number;
  maxDaysAhead: number;
}

export type SlotUnavailableReason = "booked" | "blocked" | "too_soon";

export interface Slot {
  time: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  reason?: SlotUnavailableReason;
}

export type DayClosedReason = "closed" | "holiday" | "past" | "too_far";

export interface DayAvailability {
  date: string;
  open: boolean;
  reason?: DayClosedReason;
  holidayName?: string;
  slots: Slot[];
}

export interface DayContext {
  date: string;
  now: Date;
  rules: ScheduleRules;
  /** Horário de funcionamento indexado por dia da semana (0 = domingo). */
  hours: Partial<Record<number, DayHours>>;
  holidays: Map<string, string>;
  blocks: Interval[];
  /** Atendimentos que ocupam capacidade (pendentes e confirmados). */
  busy: Interval[];
  durationMinutes: number;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

/**
 * Maior número de atendimentos simultâneos dentro de [start, end).
 * Usado para respeitar a capacidade quando ela é maior que 1.
 */
export function maxConcurrency(intervals: Interval[], start: number, end: number): number {
  const events: Array<[number, number]> = [];
  for (const it of intervals) {
    const s = Math.max(it.start.getTime(), start);
    const e = Math.min(it.end.getTime(), end);
    if (s < e) {
      events.push([s, 1], [e, -1]);
    }
  }
  // fim antes de início no mesmo instante: intervalos encostados não se somam
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0;
  let max = 0;
  for (const [, delta] of events) {
    current += delta;
    if (current > max) max = current;
  }
  return max;
}

export function workingWindows(h: DayHours): Array<[number, number]> {
  const open = timeToMinutes(h.openTime);
  const close = timeToMinutes(h.closeTime);
  if (close <= open) return [];
  if (h.breakStart && h.breakEnd) {
    const bs = timeToMinutes(h.breakStart);
    const be = timeToMinutes(h.breakEnd);
    if (bs > open && be < close && be > bs) {
      return [
        [open, bs],
        [be, close],
      ];
    }
  }
  return [[open, close]];
}

export function computeDayAvailability(ctx: DayContext): DayAvailability {
  const { date, now, rules } = ctx;
  const today = todayIn(rules.timezone, now);
  const diff = daysBetween(today, date);
  if (diff < 0) return { date, open: false, reason: "past", slots: [] };
  if (diff > rules.maxDaysAhead) return { date, open: false, reason: "too_far", slots: [] };

  const holidayName = ctx.holidays.get(date);
  if (holidayName) return { date, open: false, reason: "holiday", holidayName, slots: [] };

  const h = ctx.hours[weekdayOf(date)];
  if (!h || !h.isOpen) return { date, open: false, reason: "closed", slots: [] };

  const step = Math.max(5, rules.slotIntervalMinutes);
  const duration = ctx.durationMinutes;
  const buffer = rules.bufferMinutes * 60000;
  const earliest = now.getTime() + rules.minLeadHours * 3600000;
  const busy = ctx.busy.map((b) => ({
    start: new Date(b.start.getTime() - buffer),
    end: new Date(b.end.getTime() + buffer),
  }));

  const slots: Slot[] = [];
  for (const [winStart, winEnd] of workingWindows(h)) {
    for (let m = winStart; m + duration <= winEnd; m += step) {
      const time = minutesToTime(m);
      const startsAt = zonedToUtc(date, time, rules.timezone);
      const endsAt = new Date(startsAt.getTime() + duration * 60000);
      const s = startsAt.getTime();
      const e = endsAt.getTime();

      let reason: SlotUnavailableReason | undefined;
      if (s < earliest) reason = "too_soon";
      else if (ctx.blocks.some((b) => overlaps(s, e, b.start.getTime(), b.end.getTime())))
        reason = "blocked";
      else if (maxConcurrency(busy, s, e) >= rules.capacity) reason = "booked";

      slots.push({
        time,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        available: !reason,
        ...(reason ? { reason } : {}),
      });
    }
  }

  return { date, open: true, slots };
}

/** Verifica se um horário específico ainda pode ser reservado. */
export function isSlotBookable(ctx: DayContext, time: string): boolean {
  const day = computeDayAvailability(ctx);
  return day.slots.some((s) => s.time === time && s.available);
}

export function dateRange(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}
