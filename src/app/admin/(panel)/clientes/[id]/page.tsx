import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { AdminPage, Card, Flash, inputCls, Item, Table, Td } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { appointments, customers, quoteRequests, vehicles, visitRequests } from "@/db/schema";
import { anonymizeCustomerAction, saveCustomerNotesAction } from "@/lib/actions/admin";
import { hasRole, requireAdmin } from "@/lib/auth/session";
import { APPOINTMENT_STATUS, QUOTE_STATUS, VEHICLE_TYPE_LABEL, VISIT_STATUS, type Tone } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Cliente" };

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const admin = await requireAdmin("staff");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  if (!c) notFound();
  const tz = "America/Sao_Paulo";
  const [vs, aps, vis, qts] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.customerId, id)),
    db.select().from(appointments).where(eq(appointments.customerId, id)).orderBy(desc(appointments.startsAt)),
    db.select().from(visitRequests).where(eq(visitRequests.customerId, id)).orderBy(desc(visitRequests.createdAt)),
    db.select().from(quoteRequests).where(eq(quoteRequests.customerId, id)).orderBy(desc(quoteRequests.createdAt)),
  ]);
  const history: Array<{ href: string; when: Date; what: string; protocol: string; label: string; tone: Tone }> = [
    ...aps.map((a) => ({ href: `/admin/agendamentos/${a.id}`, when: a.startsAt, what: "Agendamento", protocol: a.protocol, label: APPOINTMENT_STATUS[a.status].label, tone: APPOINTMENT_STATUS[a.status].tone })),
    ...vis.map((v) => ({ href: `/admin/visitas/${v.id}`, when: v.createdAt, what: "Visita", protocol: v.protocol, label: VISIT_STATUS[v.status].label, tone: VISIT_STATUS[v.status].tone })),
    ...qts.map((q) => ({ href: `/admin/orcamentos/${q.id}`, when: q.createdAt, what: `Orçamento — ${q.serviceType}`, protocol: q.protocol, label: QUOTE_STATUS[q.status].label, tone: QUOTE_STATUS[q.status].tone })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());
  const removed = c.phone.startsWith("removido");

  return (
    <AdminPage title={c.name} back={{ href: "/admin/clientes", label: "Clientes" }}>
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Histórico de solicitações">
            <Table head={["Data", "Solicitação", "Protocolo", "Situação"]} empty={!history.length}>
              {history.map((h) => (
                <tr key={h.protocol}>
                  <Td><Link href={h.href} className="hover:text-orange">{formatDateTime(h.when, tz)}</Link></Td>
                  <Td>{h.what}</Td>
                  <Td className="font-tech tracking-wider">{h.protocol}</Td>
                  <Td><Badge tone={h.tone}>{h.label}</Badge></Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Veículos">
            {vs.length ? (
              <ul className="space-y-1 text-sm">{vs.map((v) => <li key={v.id}>{VEHICLE_TYPE_LABEL[v.type]} {v.brand} {v.model}{v.year ? ` (${v.year})` : ""}</li>)}</ul>
            ) : <p className="text-sm text-silver-dim">Nenhum veículo.</p>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Contato">
            <dl className="grid gap-4 text-sm">
              <Item k="Telefone" v={removed ? "Removido" : formatPhone(c.phone)} />
              <Item k="E-mail" v={c.email ?? "—"} />
              <Item k="Consentimento LGPD" v={c.consentAt ? formatDateTime(c.consentAt, tz) : "Não registrado (cadastro pelo painel)"} />
              <Item k="Cliente desde" v={formatDateTime(c.createdAt, tz)} />
            </dl>
          </Card>
          <Card title="Observações internas">
            <form action={saveCustomerNotesAction} className="space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <textarea name="internalNotes" rows={5} defaultValue={c.internalNotes ?? ""} className={inputCls} />
              <SubmitButton variant="secondary">Salvar</SubmitButton>
            </form>
          </Card>
          {hasRole(admin, "admin") && !removed && (
            <Card title="Privacidade (LGPD)">
              <p className="mb-3 text-sm text-silver-dim">Para pedidos de exclusão: remove nome, telefone, e-mail, endereços e anexos. As solicitações ficam apenas como registro estatístico.</p>
              <form action={anonymizeCustomerAction}>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton variant="danger" confirm="Remover definitivamente os dados pessoais deste cliente? Esta ação não pode ser desfeita.">Remover dados pessoais</SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
