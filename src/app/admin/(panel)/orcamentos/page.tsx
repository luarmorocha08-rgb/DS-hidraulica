import Link from "next/link";
import { desc, eq, type SQL } from "drizzle-orm";
import { AdminPage, Filters, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { customers, quoteRequests, vehicles, type QuoteStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { QUOTE_STATUS, URGENCY_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Orçamentos" };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const tz = (await getScheduleSettings()).timezone;
  const cond: SQL | undefined = sp.status && sp.status in QUOTE_STATUS ? eq(quoteRequests.status, sp.status as QuoteStatus) : undefined;
  const rows = await db
    .select({ q: quoteRequests, name: customers.name, phone: customers.phone, brand: vehicles.brand, model: vehicles.model })
    .from(quoteRequests)
    .innerJoin(customers, eq(customers.id, quoteRequests.customerId))
    .leftJoin(vehicles, eq(vehicles.id, quoteRequests.vehicleId))
    .where(cond)
    .orderBy(desc(quoteRequests.createdAt))
    .limit(200);
  return (
    <AdminPage title="Orçamentos">
      <Filters base="/admin/orcamentos" param="status" current={sp.status} options={Object.entries(QUOTE_STATUS).map(([value, s]) => ({ value, label: s.label }))} />
      <Table head={["Recebido", "Cliente", "Serviço / veículo", "Urgência", "Situação"]} empty={!rows.length}>
        {rows.map(({ q, name, phone, brand, model }) => (
          <tr key={q.id} className="hover:bg-white/[0.02]">
            <Td><Link href={`/admin/orcamentos/${q.id}`} className="font-semibold hover:text-orange">{formatDateTime(q.createdAt, tz)}</Link><span className="block font-tech text-xs tracking-wider text-silver-dim">{q.protocol}</span></Td>
            <Td>{name}<span className="block text-xs text-silver-dim">{formatPhone(phone)}</span></Td>
            <Td>{q.serviceType}<span className="block text-xs text-silver-dim">{brand} {model}</span></Td>
            <Td><Badge tone={q.urgency === "urgent" ? "danger" : q.urgency === "high" ? "warning" : "muted"}>{URGENCY_LABEL[q.urgency].split(" —")[0]}</Badge></Td>
            <Td><Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge></Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
