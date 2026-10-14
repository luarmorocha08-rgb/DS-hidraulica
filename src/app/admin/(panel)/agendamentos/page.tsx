import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { AdminPage, Filters, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { appointments, bookingTypes, customers, type AppointmentStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { APPOINTMENT_STATUS, MODALITY_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Agendamentos" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const tz = (await getScheduleSettings()).timezone;
  const conds: SQL[] = [];
  if (sp.status && sp.status in APPOINTMENT_STATUS) conds.push(eq(appointments.status, sp.status as AppointmentStatus));
  if (sp.q) {
    const q = `%${sp.q.trim()}%`;
    conds.push(or(ilike(customers.name, q), ilike(appointments.protocol, q), ilike(customers.phone, `%${sp.q.replace(/\D/g, "") || "x"}%`))!);
  }
  const rows = await db
    .select({ a: appointments, typeName: bookingTypes.name, name: customers.name, phone: customers.phone })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(bookingTypes, eq(bookingTypes.id, appointments.bookingTypeId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(appointments.startsAt))
    .limit(200);

  return (
    <AdminPage title="Agendamentos" description="Mais recentes primeiro (até 200).">
      <form className="mb-4"><input name="q" defaultValue={sp.q} placeholder="Buscar por nome, telefone ou protocolo" className="field !min-h-10 max-w-md text-sm" /></form>
      <Filters base="/admin/agendamentos" param="status" current={sp.status} options={Object.entries(APPOINTMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
      <Table head={["Data", "Cliente", "Atendimento", "Protocolo", "Situação"]} empty={!rows.length}>
        {rows.map(({ a, typeName, name, phone }) => (
          <tr key={a.id} className="hover:bg-white/[0.02]">
            <Td><Link href={`/admin/agendamentos/${a.id}`} className="font-semibold hover:text-orange">{formatDateTime(a.startsAt, tz)}</Link></Td>
            <Td>{name}<span className="block text-xs text-silver-dim">{formatPhone(phone)}</span></Td>
            <Td>{typeName}<span className="block text-xs text-silver-dim">{MODALITY_LABEL[a.modality]}</span></Td>
            <Td className="font-tech tracking-wider">{a.protocol}</Td>
            <Td><Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge></Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
