import Link from "next/link";
import { desc, eq, type SQL } from "drizzle-orm";
import { AdminPage, Filters, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { customers, visitRequests, type VisitStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { VISIT_STATUS, VISIT_PERIODS } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatCalendarDate, formatDateTime } from "@/lib/time";

export const metadata = { title: "Visitas ao local" };

const COVERAGE = { inside: ["Na área", "success"], outside: ["Fora da área", "danger"], unknown: ["A avaliar", "muted"] } as const;

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const tz = (await getScheduleSettings()).timezone;
  const cond: SQL | undefined = sp.status && sp.status in VISIT_STATUS ? eq(visitRequests.status, sp.status as VisitStatus) : undefined;
  const rows = await db
    .select({ v: visitRequests, name: customers.name, phone: customers.phone })
    .from(visitRequests)
    .innerJoin(customers, eq(customers.id, visitRequests.customerId))
    .where(cond)
    .orderBy(desc(visitRequests.createdAt))
    .limit(200);
  return (
    <AdminPage title="Visitas ao local" description="Solicitações de atendimento no endereço do cliente.">
      <Filters base="/admin/visitas" param="status" current={sp.status} options={Object.entries(VISIT_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
      <Table head={["Recebida", "Cliente", "Local", "Preferência", "Cobertura", "Situação"]} empty={!rows.length}>
        {rows.map(({ v, name, phone }) => (
          <tr key={v.id} className="hover:bg-white/[0.02]">
            <Td><Link href={`/admin/visitas/${v.id}`} className="font-semibold hover:text-orange">{formatDateTime(v.createdAt, tz)}</Link><span className="block font-tech text-xs tracking-wider text-silver-dim">{v.protocol}</span></Td>
            <Td>{name}<span className="block text-xs text-silver-dim">{formatPhone(phone)}</span></Td>
            <Td>{v.city}/{v.state}<span className="block text-xs text-silver-dim">{v.district}</span></Td>
            <Td>{v.preferredDate ? formatCalendarDate(v.preferredDate) : "—"}<span className="block text-xs text-silver-dim">{VISIT_PERIODS.find((p) => p.value === v.preferredPeriod)?.label}</span></Td>
            <Td><Badge tone={COVERAGE[v.coverage][1]}>{COVERAGE[v.coverage][0]}</Badge></Td>
            <Td><Badge tone={VISIT_STATUS[v.status].tone}>{VISIT_STATUS[v.status].label}</Badge></Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
