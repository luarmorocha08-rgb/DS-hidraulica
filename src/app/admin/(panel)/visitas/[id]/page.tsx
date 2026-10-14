import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Attachments, History, NotifyCheckbox } from "@/components/admin/RequestParts";
import { AdminPage, Card, Field, Flash, inputCls, Item } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { customers, vehicles, visitRequests } from "@/db/schema";
import { updateVisitAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { VEHICLE_TYPE_LABEL, VISIT_PERIODS, VISIT_STATUS } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatCalendarDate, formatDateTime, zonedParts } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Visita ao local" };

export default async function VisitDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("staff");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ v: visitRequests, c: customers, veh: vehicles })
    .from(visitRequests)
    .innerJoin(customers, eq(customers.id, visitRequests.customerId))
    .leftJoin(vehicles, eq(vehicles.id, visitRequests.vehicleId))
    .where(eq(visitRequests.id, id));
  if (!row) notFound();
  const { v, c, veh } = row;
  const tz = (await getScheduleSettings()).timezone;
  const sched = v.scheduledAt ? zonedParts(v.scheduledAt, tz) : null;
  const address = [`${v.street}, ${v.number}`, v.complement, v.district, `${v.city}/${v.state}`, v.postalCode && `CEP ${v.postalCode}`].filter(Boolean).join(" · ");
  const mapQ = v.latitude != null ? `${v.latitude},${v.longitude}` : encodeURIComponent(address);
  const wa = whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}! Aqui é da DS Hidráulica, sobre a sua solicitação de visita ${v.protocol}.`);

  return (
    <AdminPage title={`Visita — ${c.name}`} description={<span className="font-tech tracking-wider">{v.protocol}</span>} back={{ href: "/admin/visitas", label: "Visitas" }} actions={<Badge tone={VISIT_STATUS[v.status].tone}>{VISIT_STATUS[v.status].label}</Badge>}>
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Solicitação">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Endereço" v={address} wide />
              {v.reference && <Item k="Referência" v={v.reference} wide />}
              <Item k="Mapa" v={<a className="text-orange hover:underline" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${mapQ}`}>Abrir no Google Maps</a>} />
              <Item k="Cobertura" v={v.coverage === "inside" ? "Dentro da área" : v.coverage === "outside" ? "Fora da área — depende de avaliação" : "Não verificada"} />
              <Item k="Data preferida" v={v.preferredDate ? formatCalendarDate(v.preferredDate) : "Sem preferência"} />
              <Item k="Período" v={VISIT_PERIODS.find((p) => p.value === v.preferredPeriod)?.label ?? "—"} />
              <Item k="Problema" v={v.problemDescription} wide />
              <Item k="Recebida em" v={formatDateTime(v.createdAt, tz)} />
            </dl>
          </Card>
          <Card title="Cliente e veículo" actions={<Link href={`/admin/clientes/${c.id}`} className="text-sm text-orange hover:underline">Ver cliente</Link>}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Nome" v={c.name} />
              <Item k="Telefone" v={<span className="flex items-center gap-2">{formatPhone(c.phone)} {wa && <a href={wa} target="_blank" rel="noopener" className="text-[#25d366]" aria-label="WhatsApp"><WhatsAppIcon className="size-4" /></a>}</span>} />
              {c.email && <Item k="E-mail" v={c.email} />}
              {veh && <Item k="Veículo" v={`${VEHICLE_TYPE_LABEL[veh.type]} ${veh.brand} ${veh.model}${veh.year ? ` (${veh.year})` : ""}`} />}
            </dl>
          </Card>
          <Attachments kind="visit" id={v.id} />
        </div>
        <div className="space-y-6">
          <Card title="Atualizar visita">
            <form action={updateVisitAction} className="space-y-3">
              <input type="hidden" name="id" value={v.id} />
              <Field label="Situação">
                <select name="status" defaultValue={v.status} className={inputCls}>
                  {Object.entries(VISIT_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data marcada"><input type="date" name="scheduledDate" defaultValue={sched?.date} className={inputCls} /></Field>
                <Field label="Horário"><input type="time" name="scheduledTime" defaultValue={sched?.time} className={inputCls} /></Field>
              </div>
              <Field label="Deslocamento (informado ao cliente)"><input name="travelFeeNote" defaultValue={v.travelFeeNote ?? ""} placeholder="Ex.: taxa de deslocamento de R$ … combinada" className={inputCls} /></Field>
              <Field label="Mensagem ao cliente (opcional)"><textarea name="note" rows={2} className={inputCls} /></Field>
              <Field label="Observações internas"><textarea name="internalNotes" rows={3} defaultValue={v.internalNotes ?? ""} className={inputCls} /></Field>
              <NotifyCheckbox />
              <SubmitButton>Salvar</SubmitButton>
            </form>
          </Card>
          <History kind="visit" id={v.id} tz={tz} labels={VISIT_STATUS} />
        </div>
      </div>
    </AdminPage>
  );
}
