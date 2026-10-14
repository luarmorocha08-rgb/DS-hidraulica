import "server-only";
import { and, asc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  bookingTypes,
  businessHours,
  holidays,
  scheduleBlocks,
  scheduleSettings,
  type ScheduleSettings,
} from "@/db/schema";
import { computeDayAvailability, type DayAvailability, type DayContext, type DayHours } from "./availability";
import type { Executor } from "./customers";
import { addDays, daysInMonth, zonedToUtc } from "./time";

export const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"] as const;

export async function getScheduleSettings(tx: Executor = db): Promise<ScheduleSettings> {
  const [row] = await tx.select().from(scheduleSettings).where(eq(scheduleSettings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await tx.insert(scheduleSettings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await tx.select().from(scheduleSettings).where(eq(scheduleSettings.id, 1)))[0];
}

export async function getBusinessHours(tx: Executor = db) {
  const rows = await tx.select().from(businessHours).orderBy(asc(businessHours.weekday));
  const map: Partial<Record<number, DayHours>> = {};
  for (const r of rows) map[r.weekday] = r;
  return map;
}

export async function getBookingType(id: string, tx: Executor = db) {
  const [row] = await tx
    .select()
    .from(bookingTypes)
    .where(and(eq(bookingTypes.id, id), eq(bookingTypes.active, true)))
    .limit(1);
  return row ?? null;
}

/** Carrega tudo o que o cálculo de disponibilidade precisa para um intervalo de datas. */
export async function loadScheduleContext(
  fromDate: string,
  toDate: string,
  opts: { excludeAppointmentId?: string } = {},
  tx: Executor = db,
) {
  const rules = await getScheduleSettings(tx);
  const hours = await getBusinessHours(tx);
  const tz = rules.timezone;
  // margem de um dia nos dois lados cobre fuso e folga entre atendimentos
  const from = zonedToUtc(addDays(fromDate, -1), "00:00", tz);
  const to = zonedToUtc(addDays(toDate, 2), "00:00", tz);

  // consultas sequenciais: dentro de uma transação há uma única conexão
  const holidayRows = await tx
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, fromDate), lte(holidays.date, toDate)));
  const blockRows = await tx
      .select()
      .from(scheduleBlocks)
      .where(and(sql`${scheduleBlocks.startsAt} < ${to.toISOString()}`, sql`${scheduleBlocks.endsAt} > ${from.toISOString()}`));
  const busyRows = await tx
      .select({ id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          inArray(appointments.status, [...ACTIVE_APPOINTMENT_STATUSES]),
          sql`${appointments.startsAt} < ${to.toISOString()}`,
          sql`${appointments.endsAt} > ${from.toISOString()}`,
          opts.excludeAppointmentId ? ne(appointments.id, opts.excludeAppointmentId) : undefined,
        ),
      );

  return {
    rules,
    hours,
    holidays: new Map(holidayRows.map((h) => [h.date, h.name])),
    blocks: blockRows.map((b) => ({ start: b.startsAt, end: b.endsAt })),
    busy: busyRows.map((b) => ({ start: b.startsAt, end: b.endsAt })),
  };
}

type LoadedContext = Awaited<ReturnType<typeof loadScheduleContext>>;

export function dayContext(loaded: LoadedContext, date: string, durationMinutes: number, now = new Date()): DayContext {
  return {
    date,
    now,
    rules: loaded.rules,
    hours: loaded.hours,
    holidays: loaded.holidays,
    blocks: loaded.blocks,
    busy: loaded.busy,
    durationMinutes,
  };
}

export async function getDayAvailability(
  date: string,
  durationMinutes: number,
  opts: { excludeAppointmentId?: string } = {},
): Promise<DayAvailability> {
  const loaded = await loadScheduleContext(date, date, opts);
  return computeDayAvailability(dayContext(loaded, date, durationMinutes));
}

export type DayStatus = "available" | "full" | "closed" | "holiday" | "past" | "too_far";

export async function getMonthAvailability(
  month: string,
  durationMinutes: number,
  opts: { excludeAppointmentId?: string } = {},
) {
  const days = daysInMonth(month);
  const loaded = await loadScheduleContext(days[0], days[days.length - 1], opts);
  const now = new Date();
  return {
    timezone: loaded.rules.timezone,
    maxDaysAhead: loaded.rules.maxDaysAhead,
    days: days.map((date) => {
      const day = computeDayAvailability(dayContext(loaded, date, durationMinutes, now));
      const free = day.slots.filter((s) => s.available).length;
      let status: DayStatus;
      if (!day.open) status = day.reason === "holiday" ? "holiday" : (day.reason ?? "closed");
      else status = free > 0 ? "available" : "full";
      return { date, status, free, holidayName: day.holidayName };
    }),
  };
}
