import Link from "next/link";
import { clsx } from "clsx";
import { AdminPage } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { holidays, scheduleBlocks } from "@/db/schema";
import { appointmentsBetween } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/session";
import { APPOINTMENT_STATUS, MODALITY_LABEL, WEEKDAY_NAMES } from "@/lib/labels";
import { getScheduleSettings } from "@/lib/schedule";
import { addDays, formatTime, todayIn, weekdayOf, zonedParts, zonedToUtc } from "@/lib/time";
import { and, gte, lte, sql } from "drizzle-orm";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const tz = (await getScheduleSettings()).timezone;
  const today = todayIn(tz);
  const ref = sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? sp.semana : today;
  const monday = addDays(ref, -((weekdayOf(ref) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = zonedToUtc(monday, "00:00", tz);
  const to = zonedToUtc(addDays(monday, 7), "00:00", tz);

  const [items, hol, blocks] = await Promise.all([
    appointmentsBetween(from, to),
    db.select().from(holidays).where(and(gte(holidays.date, monday), lte(holidays.date, days[6]))),
    db.select().from(scheduleBlocks).where(and(sql`${scheduleBlocks.startsAt} < ${to.toISOString()}`, sql`${scheduleBlocks.endsAt} > ${from.toISOString()}`)),
  ]);

  return (
    <AdminPage
      title="Agenda"
      description={`Semana de ${monday.split("-").reverse().join("/")} a ${days[6].split("-").reverse().join("/")}`}
      actions={
        <>
          <Link href={`/admin/agenda?semana=${addDays(monday, -7)}`} className={buttonClass("secondary", "sm")}>← Anterior</Link>
          <Link href="/admin/agenda" className={buttonClass("secondary", "sm")}>Hoje</Link>
          <Link href={`/admin/agenda?semana=${addDays(monday, 7)}`} className={buttonClass("secondary", "sm")}>Próxima →</Link>
          <Link href="/admin/agenda/novo" className={buttonClass("primary", "sm")}>+ Novo</Link>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((d) => {
          const dayItems = items.filter((a) => zonedParts(a.startsAt, tz).date === d);
          const holiday = hol.find((h) => h.date === d);
          const dayStart = zonedToUtc(d, "00:00", tz).getTime();
          const dayEnd = zonedToUtc(addDays(d, 1), "00:00", tz).getTime();
          const dayBlocks = blocks.filter((b) => b.startsAt.getTime() < dayEnd && b.endsAt.getTime() > dayStart);
          return (
            <section key={d} className={clsx("min-h-40 rounded-[12px] border bg-ink-2 p-3", d === today ? "border-orange/60" : "border-white/[0.08]")}>
              <header className="mb-2 flex items-baseline justify-between">
                <h2 className="font-heading font-bold">{WEEKDAY_NAMES[weekdayOf(d)]}</h2>
                <span className="font-tech text-sm text-silver-dim">{d.slice(8)}/{d.slice(5, 7)}</span>
              </header>
              {holiday && <p className="mb-2 rounded bg-warning/10 px-2 py-1 text-xs text-warning">Feriado: {holiday.name}</p>}
              {dayBlocks.map((b) => (
                <p key={b.id} className="mb-2 rounded bg-white/5 px-2 py-1 text-xs text-silver">
                  Bloqueado {formatTime(b.startsAt, tz)}–{formatTime(b.endsAt, tz)}: {b.reason}
                </p>
              ))}
              <ul className="space-y-1.5">
                {dayItems.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/agendamentos/${a.id}`}
                      className={clsx(
                        "block rounded-md border-l-2 bg-white/[0.03] px-2 py-1.5 text-xs hover:bg-white/[0.07]",
                        a.status === "confirmed" && "border-success",
                        a.status === "pending" && "border-warning",
                        !["confirmed", "pending"].includes(a.status) && "border-white/20 opacity-60",
                      )}
                    >
                      <span className="font-tech text-sm font-semibold">{formatTime(a.startsAt, tz)}–{formatTime(a.endsAt, tz)}</span>
                      <span className="block font-semibold">{a.customerName}</span>
                      <span className="block text-silver-dim">{a.typeName} · {a.modality === "onsite" ? `local${a.city ? ` (${a.city})` : ""}` : "oficina"}</span>
                      <span className="block text-silver-dim">{APPOINTMENT_STATUS[a.status].label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {!dayItems.length && !holiday && <p className="text-xs text-silver-dim">Sem agendamentos.</p>}
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-silver-dim">
        <span className="text-success">■</span> confirmado · <span className="text-warning">■</span> aguardando confirmação · esmaecido: cancelado/concluído. {MODALITY_LABEL.workshop} e {MODALITY_LABEL.onsite.toLowerCase()} aparecem juntos.
      </p>
    </AdminPage>
  );
}
