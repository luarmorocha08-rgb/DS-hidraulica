import { asc, gte } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls, Table, Td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { holidays, scheduleBlocks } from "@/db/schema";
import { addBlockAction, addHolidayAction, deleteBlockAction, deleteHolidayAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { getScheduleSettings } from "@/lib/schedule";
import { formatCalendarDate, formatDateTime, todayIn } from "@/lib/time";

export const metadata = { title: "Feriados e bloqueios" };

export default async function BlocksPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const tz = (await getScheduleSettings()).timezone;
  const [hol, blocks] = await Promise.all([
    db.select().from(holidays).where(gte(holidays.date, todayIn(tz))).orderBy(asc(holidays.date)),
    db.select().from(scheduleBlocks).where(gte(scheduleBlocks.endsAt, new Date())).orderBy(asc(scheduleBlocks.startsAt)),
  ]);
  return (
    <AdminPage title="Feriados, férias e bloqueios" description="Datas e períodos sem atendimento. A agenda online deixa de oferecer esses horários.">
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Bloquear período (férias, manutenção, compromisso)">
          <form action={addBlockAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Data inicial"><input type="date" name="startDate" required className={inputCls} /></Field>
            <Field label="Hora inicial (vazio = dia todo)"><input type="time" name="startTime" className={inputCls} /></Field>
            <Field label="Data final"><input type="date" name="endDate" className={inputCls} /></Field>
            <Field label="Hora final"><input type="time" name="endTime" className={inputCls} /></Field>
            <Field label="Motivo" className="sm:col-span-2"><input name="reason" placeholder="Ex.: férias coletivas" className={inputCls} /></Field>
            <div><SubmitButton>Bloquear</SubmitButton></div>
          </form>
          <div className="mt-6">
            <Table head={["Período", "Motivo", ""]} empty={!blocks.length}>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <Td>{formatDateTime(b.startsAt, tz)} → {formatDateTime(b.endsAt, tz)}</Td>
                  <Td>{b.reason}</Td>
                  <Td>
                    <form action={deleteBlockAction}><input type="hidden" name="id" value={b.id} /><SubmitButton variant="danger" confirm="Remover este bloqueio?">Remover</SubmitButton></form>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
        <Card title="Feriados">
          <form action={addHolidayAction} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <Field label="Data"><input type="date" name="date" required className={inputCls} /></Field>
            <Field label="Nome"><input name="name" placeholder="Ex.: Natal" className={inputCls} /></Field>
            <SubmitButton>Adicionar</SubmitButton>
          </form>
          <div className="mt-6">
            <Table head={["Data", "Feriado", ""]} empty={!hol.length}>
              {hol.map((h) => (
                <tr key={h.id}>
                  <Td>{formatCalendarDate(h.date)}</Td>
                  <Td>{h.name}</Td>
                  <Td>
                    <form action={deleteHolidayAction}><input type="hidden" name="id" value={h.id} /><SubmitButton variant="danger">Remover</SubmitButton></form>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
