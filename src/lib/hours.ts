import type { DayHours } from "./availability";

const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const fmt = (t: string) => t.replace(":00", "h").replace(":", "h");

function describe(h: DayHours) {
  if (h.breakStart && h.breakEnd) return `${fmt(h.openTime)}–${fmt(h.breakStart)} e ${fmt(h.breakEnd)}–${fmt(h.closeTime)}`;
  return `${fmt(h.openTime)}–${fmt(h.closeTime)}`;
}

/** Agrupa dias consecutivos com o mesmo horário: "Seg–Sex: 8h–12h e 13h–18h". */
export function summarizeHours(hours: Partial<Record<number, DayHours>>): string[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: Array<{ days: number[]; text: string }> = [];
  for (const d of order) {
    const h = hours[d];
    if (!h || !h.isOpen) continue;
    const text = describe(h);
    const last = groups[groups.length - 1];
    const prevDay = last?.days[last.days.length - 1];
    const consecutive = last && order.indexOf(d) === order.indexOf(prevDay!) + 1;
    if (last && last.text === text && consecutive) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  return groups.map((g) => {
    const label = g.days.length > 1 ? `${SHORT[g.days[0]]}–${SHORT[g.days[g.days.length - 1]]}` : SHORT[g.days[0]];
    return `${label}: ${g.text}`;
  });
}
