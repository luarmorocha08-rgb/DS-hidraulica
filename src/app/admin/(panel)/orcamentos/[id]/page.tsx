import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Attachments, History, NotifyCheckbox } from "@/components/admin/RequestParts";
import { AdminPage, Card, Field, Flash, inputCls, Item } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { customers, quoteRequests, vehicles } from "@/db/schema";
import { updateQuoteAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { QUOTE_STATUS, URGENCY_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatDateTime } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Orçamento" };

export default async function QuoteDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("staff");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ q: quoteRequests, c: customers, v: vehicles })
    .from(quoteRequests)
    .innerJoin(customers, eq(customers.id, quoteRequests.customerId))
    .leftJoin(vehicles, eq(vehicles.id, quoteRequests.vehicleId))
    .where(eq(quoteRequests.id, id));
  if (!row) notFound();
  const { q, c, v } = row;
  const tz = (await getScheduleSettings()).timezone;
  const wa = whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}! Aqui é da DS Hidráulica, sobre o seu pedido de orçamento ${q.protocol}.`);
  return (
    <AdminPage title={`Orçamento — ${c.name}`} description={<span className="font-tech tracking-wider">{q.protocol}</span>} back={{ href: "/admin/orcamentos", label: "Orçamentos" }} actions={<Badge tone={QUOTE_STATUS[q.status].tone}>{QUOTE_STATUS[q.status].label}</Badge>}>
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Pedido">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Serviço" v={q.serviceType} />
              <Item k="Urgência" v={URGENCY_LABEL[q.urgency]} />
              <Item k="Problema" v={q.problemDescription} wide />
              <Item k="Recebido em" v={formatDateTime(q.createdAt, tz)} />
            </dl>
          </Card>
          <Card title="Cliente e veículo" actions={<Link href={`/admin/clientes/${c.id}`} className="text-sm text-orange hover:underline">Ver cliente</Link>}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Nome" v={c.name} />
              <Item k="Telefone" v={<span className="flex items-center gap-2">{formatPhone(c.phone)} {wa && <a href={wa} target="_blank" rel="noopener" className="text-[#25d366]" aria-label="WhatsApp"><WhatsAppIcon className="size-4" /></a>}</span>} />
              {c.email && <Item k="E-mail" v={c.email} />}
              {v && <Item k="Veículo" v={`${VEHICLE_TYPE_LABEL[v.type]} ${v.brand} ${v.model}${v.year ? ` (${v.year})` : ""}`} />}
            </dl>
          </Card>
          <Attachments kind="quote" id={q.id} />
        </div>
        <div className="space-y-6">
          <Card title="Responder">
            <form action={updateQuoteAction} className="space-y-3">
              <input type="hidden" name="id" value={q.id} />
              <Field label="Situação">
                <select name="status" defaultValue={q.status} className={inputCls}>
                  {Object.entries(QUOTE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Resposta ao cliente (aparece no acompanhamento)"><textarea name="responseNote" rows={4} defaultValue={q.responseNote ?? ""} className={inputCls} placeholder="Ex.: orçamento enviado pelo WhatsApp; precisamos de foto da etiqueta da caixa…" /></Field>
              <Field label="Observações internas"><textarea name="internalNotes" rows={3} defaultValue={q.internalNotes ?? ""} className={inputCls} /></Field>
              <NotifyCheckbox />
              <SubmitButton>Salvar</SubmitButton>
            </form>
          </Card>
          <History kind="quote" id={q.id} tz={tz} labels={QUOTE_STATUS} />
        </div>
      </div>
    </AdminPage>
  );
}
