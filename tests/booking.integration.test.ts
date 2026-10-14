/**
 * Integração com PostgreSQL real (TEST_DATABASE_URL).
 * Garante que reservas simultâneas não ultrapassam a capacidade.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const TEST_URL = process.env.TEST_DATABASE_URL;
const run = TEST_URL ? describe : describe.skip;

run("reservas simultâneas (PostgreSQL)", () => {
  let mod: typeof import("@/lib/booking");
  let dbMod: typeof import("@/db");
  let bookingTypeId: string;
  let date: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    process.env.DATABASE_POOL_MAX = "12";
    dbMod = await import("@/db");
    mod = await import("@/lib/booking");
    const { db } = dbMod;
    await db.execute(sql`drop schema if exists public cascade; create schema public;`);
    await db.execute(sql`drop schema if exists drizzle cascade;`);
    await migrate(db, { migrationsFolder: "src/db/migrations" });

    const { SEED_BOOKING_TYPES, SEED_BUSINESS_HOURS } = await import("@/db/seed-data");
    const s = await import("@/db/schema");
    await db.insert(s.scheduleSettings).values({ id: 1, minLeadHours: 0 });
    await db.insert(s.businessHours).values(SEED_BUSINESS_HOURS);
    await db.insert(s.bookingTypes).values(SEED_BOOKING_TYPES.map((b) => ({ ...b })));
    const [diag] = await db.select().from(s.bookingTypes).where(sql`slug = 'diagnostico'`);
    bookingTypeId = diag.id;

    const { addDays, todayIn, weekdayOf } = await import("@/lib/time");
    date = addDays(todayIn("America/Sao_Paulo"), 3);
    while (![1, 2, 3, 4, 5].includes(weekdayOf(date))) date = addDays(date, 1);
  });

  beforeEach(async () => {
    await dbMod.db.execute(sql`truncate appointments, customers, vehicles, request_events cascade`);
  });

  afterAll(async () => {
    await dbMod?.closeDb();
  });

  const input = (i: number) => ({
    bookingTypeId,
    modality: "workshop" as const,
    date,
    time: "09:00",
    problemDescription: "Direção pesada ao manobrar no pátio.",
    name: `Cliente ${i}`,
    phone: `55119${String(10000000 + i).padStart(8, "0")}`,
    vehicleType: "caminhao" as const,
    vehicleBrand: "Volvo",
    vehicleModel: "FH 540",
    consent: "on",
  });

  const settings = async () => (await import("@/lib/settings-schema")).DEFAULT_SITE_SETTINGS;

  it("capacidade 1: só uma de 10 reservas simultâneas é aceita", async () => {
    await dbMod.db.execute(sql`update schedule_settings set capacity = 1`);
    const s = await settings();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => mod.bookAppointment(input(i) as never, { settings: s })),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const taken = results.filter(
      (r) => r.status === "rejected" && (r.reason as { code?: string }).code === "slot_taken",
    );
    expect(ok).toHaveLength(1);
    expect(taken).toHaveLength(9);
    const count = await dbMod.db.execute<{ n: string }>(sql`select count(*)::text as n from appointments`);
    expect(count.rows[0].n).toBe("1");
  });

  it("capacidade 2: exatamente duas reservas aceitas", async () => {
    await dbMod.db.execute(sql`update schedule_settings set capacity = 2`);
    const s = await settings();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => mod.bookAppointment(input(i) as never, { settings: s })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  });

  it("novo agendamento na oficina fica pendente e gera protocolo e histórico", async () => {
    await dbMod.db.execute(sql`update schedule_settings set capacity = 1, auto_confirm_workshop = false`);
    const { appointment } = await mod.bookAppointment(input(1) as never, { settings: await settings() });
    expect(appointment.status).toBe("pending");
    expect(appointment.protocol).toMatch(/^DS-AG-[0-9A-Z]{6}$/);
    const ev = await dbMod.db.execute(sql`select to_status from request_events where request_id = ${appointment.id}`);
    expect(ev.rows).toHaveLength(1);
  });

  it("reagendamento libera o horário antigo e bloqueia o novo", async () => {
    await dbMod.db.execute(sql`update schedule_settings set capacity = 1`);
    const s = await settings();
    const { appointment } = await mod.bookAppointment(input(1) as never, { settings: s });
    await mod.rescheduleAppointment(appointment.id, date, "14:00", "customer");
    // 09:00 livre novamente
    await expect(mod.bookAppointment(input(2) as never, { settings: s })).resolves.toBeTruthy();
    // 14:00 ocupado
    await expect(
      mod.bookAppointment({ ...input(3), time: "14:00" } as never, { settings: s }),
    ).rejects.toMatchObject({ code: "slot_taken" });
  });

  it("recusa horário fora do expediente", async () => {
    await expect(
      mod.bookAppointment({ ...input(1), time: "12:00" } as never, { settings: await settings() }),
    ).rejects.toMatchObject({ code: "slot_taken" });
  });
});
