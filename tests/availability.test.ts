import { describe, expect, it } from "vitest";
import { computeDayAvailability, maxConcurrency, type DayContext } from "@/lib/availability";
import { zonedToUtc, zonedParts, addDays, weekdayOf } from "@/lib/time";

const TZ = "America/Sao_Paulo";

function ctx(overrides: Partial<DayContext> = {}): DayContext {
  return {
    date: "2026-11-03", // terça-feira
    now: new Date("2026-11-01T12:00:00Z"),
    rules: {
      timezone: TZ,
      slotIntervalMinutes: 60,
      bufferMinutes: 0,
      capacity: 1,
      minLeadHours: 2,
      maxDaysAhead: 30,
    },
    hours: {
      2: { isOpen: true, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
    },
    holidays: new Map(),
    blocks: [],
    busy: [],
    durationMinutes: 60,
    ...overrides,
  };
}

const at = (time: string, date = "2026-11-03") => zonedToUtc(date, time, TZ);

describe("time helpers", () => {
  it("converte horário de São Paulo para UTC (UTC-3)", () => {
    expect(at("08:00").toISOString()).toBe("2026-11-03T11:00:00.000Z");
    expect(zonedParts(new Date("2026-11-03T11:00:00Z"), TZ).time).toBe("08:00");
  });
  it("soma dias e calcula o dia da semana", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayOf("2026-11-03")).toBe(2);
  });
});

describe("computeDayAvailability", () => {
  it("gera horários que cabem inteiros no expediente", () => {
    const day = computeDayAvailability(ctx());
    expect(day.open).toBe(true);
    expect(day.slots.map((s) => s.time)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(day.slots.every((s) => s.available)).toBe(true);
  });

  it("não oferece horário que ultrapassa o fechamento", () => {
    const day = computeDayAvailability(ctx({ durationMinutes: 120 }));
    expect(day.slots.map((s) => s.time)).toEqual(["08:00", "09:00", "10:00"]);
  });

  it("respeita o intervalo de almoço", () => {
    const day = computeDayAvailability(
      ctx({
        hours: {
          2: { isOpen: true, openTime: "08:00", closeTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
        },
        durationMinutes: 90,
      }),
    );
    const times = day.slots.map((s) => s.time);
    expect(times).toContain("10:00"); // 10:00–11:30
    expect(times).not.toContain("11:00"); // invadiria o almoço
    expect(times).not.toContain("12:00");
    expect(times).toContain("13:00");
    expect(times).not.toContain("16:00"); // passaria das 17h
  });

  it("marca horários reservados e respeita a folga entre atendimentos", () => {
    const busy = [{ start: at("09:00"), end: at("10:00") }];
    const day = computeDayAvailability(ctx({ busy }));
    expect(day.slots.find((s) => s.time === "09:00")).toMatchObject({ available: false, reason: "booked" });
    expect(day.slots.find((s) => s.time === "10:00")?.available).toBe(true);

    const withBuffer = computeDayAvailability(
      ctx({ busy, rules: { ...ctx().rules, bufferMinutes: 15 } }),
    );
    expect(withBuffer.slots.find((s) => s.time === "08:00")?.available).toBe(false);
    expect(withBuffer.slots.find((s) => s.time === "10:00")?.available).toBe(false);
    expect(withBuffer.slots.find((s) => s.time === "11:00")?.available).toBe(true);
  });

  it("permite atendimentos simultâneos até a capacidade", () => {
    const busy = [{ start: at("09:00"), end: at("10:00") }];
    const rules = { ...ctx().rules, capacity: 2 };
    expect(computeDayAvailability(ctx({ busy, rules })).slots[1].available).toBe(true);
    const full = [...busy, { start: at("09:00"), end: at("10:00") }];
    expect(computeDayAvailability(ctx({ busy: full, rules })).slots[1].available).toBe(false);
  });

  it("calcula concorrência real, não a soma de sobreposições", () => {
    // 08:00–09:00 e 09:00–10:00 não acontecem ao mesmo tempo
    const busy = [
      { start: at("08:00"), end: at("09:00") },
      { start: at("09:00"), end: at("10:00") },
    ];
    expect(maxConcurrency(busy, at("08:00").getTime(), at("10:00").getTime())).toBe(1);
  });

  it("bloqueios e feriados fecham a agenda", () => {
    const blocked = computeDayAvailability(
      ctx({ blocks: [{ start: at("10:30"), end: at("12:00") }] }),
    );
    expect(blocked.slots.filter((s) => s.reason === "blocked").map((s) => s.time)).toEqual(["10:00", "11:00"]);

    const holiday = computeDayAvailability(ctx({ holidays: new Map([["2026-11-03", "Feriado"]]) }));
    expect(holiday).toMatchObject({ open: false, reason: "holiday", holidayName: "Feriado" });
  });

  it("dias fechados, passados e além da janela", () => {
    expect(computeDayAvailability(ctx({ date: "2026-11-04" })).reason).toBe("closed");
    expect(computeDayAvailability(ctx({ date: "2026-10-30" })).reason).toBe("past");
    expect(computeDayAvailability(ctx({ date: "2027-02-02" })).reason).toBe("too_far");
  });

  it("aplica a antecedência mínima", () => {
    const now = new Date(at("08:30").getTime());
    const day = computeDayAvailability(ctx({ now }));
    expect(day.slots.find((s) => s.time === "09:00")?.reason).toBe("too_soon");
    expect(day.slots.find((s) => s.time === "10:00")?.reason).toBe("too_soon");
    expect(day.slots.find((s) => s.time === "11:00")?.available).toBe(true);
  });
});
