/**
 * Utilitários de data/hora com fuso explícito.
 * Datas "de calendário" circulam como string "YYYY-MM-DD" e horários como
 * "HH:MM", sempre no fuso da empresa. Instantes são `Date` (UTC).
 */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    date: `${year}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

/** Diferença (em minutos) entre o horário local do fuso e UTC naquele instante. */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

export function parseDate(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Data inválida: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function parseTime(time: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new Error(`Horário inválido: ${time}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error(`Horário inválido: ${time}`);
  return { hour, minute };
}

export function timeToMinutes(time: string) {
  const { hour, minute } = parseTime(time);
  return hour * 60 + minute;
}

export function minutesToTime(total: number) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Converte data + hora locais do fuso para o instante UTC correspondente. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const { year, month, day } = parseDate(date);
  const { hour, minute } = parseTime(time);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = tzOffsetMinutes(new Date(guess), timeZone);
  const candidate = guess - offset1 * 60000;
  const offset2 = tzOffsetMinutes(new Date(candidate), timeZone);
  return new Date(offset1 === offset2 ? candidate : guess - offset2 * 60000);
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12));
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86400000,
  );
}

export function todayIn(timeZone: string, now = new Date()): string {
  return zonedParts(now, timeZone).date;
}

export function daysInMonth(month: string): string[] {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Mês inválido: ${month}`);
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${m[1]}-${m[2]}-${pad(i + 1)}`);
}

const ptDate = new Map<string, Intl.DateTimeFormat>();
function ptFormatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = timeZone + JSON.stringify(options);
  let f = ptDate.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("pt-BR", { timeZone, ...options });
    ptDate.set(key, f);
  }
  return f;
}

export function formatDateLong(instant: Date, timeZone: string) {
  return ptFormatter(timeZone, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(instant);
}

export function formatDateShort(instant: Date, timeZone: string) {
  return ptFormatter(timeZone, { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    instant,
  );
}

export function formatTime(instant: Date, timeZone: string) {
  return ptFormatter(timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    instant,
  );
}

export function formatDateTime(instant: Date, timeZone: string) {
  return `${formatDateShort(instant, timeZone)} às ${formatTime(instant, timeZone)}`;
}

/** "2026-10-14" → "14/10/2026" sem conversão de fuso. */
export function formatCalendarDate(date: string) {
  const { year, month, day } = parseDate(date);
  return `${pad(day)}/${pad(month)}/${year}`;
}
