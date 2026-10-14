import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Attachments, History, NotifyCheckbox } from "@/components/admin/RequestParts";
import { AdminPage, Card, Field, Flash, inputCls, Item } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { appointments, bookingTypes, customers, services, vehicles } from "@/db/schema";
import { rescheduleAppointmentAdminAction, saveAppointmentNotesAction, updateAppointmentStatusAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { APPOINTMENT_STATUS, MODALITY_LABEL, VEHICLE_TYPE_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { formatDateLong, formatDateTime, formatTime, zonedParts } from "@/lib/time";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Agendamento" };

export default async function AppointmentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("staff");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ a: appointments, t: bookingTypes, c: customers, v: vehicles, s: services })
    .from(appointments)
    .innerJoin(bookingTypes, eq(bookingTypes.id, appointments.bookingTypeId))
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .leftJoin(vehicles, eq(vehicles.id, appointments.vehicleId))
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .where(eq(appointments.id, id));
  if (!row) notFound();
  const { a, t, c, v, s } = row;
  const tz = (await getScheduleSettings()).timezone;
  const st = APPOINTMENT_STATUS[a.status];
  const local = zonedParts(a.startsAt, tz);
  const wa = whatsappLink(c.phone, `Olá, ${c.name.split(" ")[0]}! Aqui é da DS Hidráulica, sobre o seu agendamento ${a.protocol} (${formatDateLong(a.startsAt, tz)}, ${formatTime(a.startsAt, tz)}).`);
  const address = a.modality === "onsite" ? [a.street && `${a.street}, ${a.number}`, a.complement, a.district, a.city && `${a.city}/${a.state}`, a.postalCode && `CEP ${a.postalCode}`, a.reference && `Ref.: ${a.reference}`].filter(Boolean).join(" · ") : null;

  return (
    <AdminPage title={`${t.name} — ${c.name}`} description={<span className="font-tech tracking-wider">{a.protocol}</span>} back={{ href: "/admin/agendamentos", label: "Agendamentos" }} actions={<Badge tone={st.tone}>{st.label}</Badge>}>
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Detalhes">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Data e horário" v={`${formatDateLong(a.startsAt, tz)}, ${formatTime(a.startsAt, tz)}–${formatTime(a.endsAt, tz)}`} />
              <Item k="Modalidade" v={MODALITY_LABEL[a.modality]} />
              {address && <Item k="Endereço" v={address} wide />}
              {a.modality === "onsite" && a.latitude != null && (
                <Item k="Localização" v={<a className="text-orange hover:underline" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>Abrir no mapa</a>} />
              )}
              {a.coverage && <Item k="Área de cobertura" v={a.coverage === "inside" ? "Dentro da área" : a.coverage === "outside" ? "Fora da área — avaliar" : "Não verificada"} />}
              {s && <Item k="Serviço de interesse" v={s.name} />}
              <Item k="Problema" v={a.problemDescription} wide />
              {a.customerNotes && <Item k="Observações do cliente" v={a.customerNotes} wide />}
              <Item k="Origem" v={a.source === "admin" ? "Criado no painel" : "Site"} />
              <Item k="Criado em" v={formatDateTime(a.createdAt, tz)} />
            </dl>
          </Card>
          <Card title="Cliente e veículo" actions={<Link href={`/admin/clientes/${c.id}`} className="text-sm text-orange hover:underline">Ver cliente</Link>}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item k="Nome" v={c.name} />
              <Item k="Telefone" v={<span className="flex items-center gap-2">{formatPhone(c.phone)} {wa && <a href={wa} target="_blank" rel="noopener" className="text-[#25d366]" aria-label="Abrir WhatsApp"><WhatsAppIcon className="size-4" /></a>}</span>} />
              {c.email && <Item k="E-mail" v={c.email} />}
              {v && <Item k="Veículo" v={`${VEHICLE_TYPE_LABEL[v.type]} ${v.brand} ${v.model}${v.year ? ` (${v.year})` : ""}`} />}
            </dl>
          </Card>
          <Attachments kind="appointment" id={a.id} />
        </div>

        <div className="space-y-6">
          <Card title="Situação">
            <form action={updateAppointmentStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={a.id} />
              <Field label="Nova situação">
                <select name="status" defaultValue={a.status} className={inputCls}>
                  {Object.entries(APPOINTMENT_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Mensagem ao cliente (opcional)"><textarea name="note" rows={2} className={inputCls} /></Field>
              <NotifyCheckbox />
              <SubmitButton>Atualizar situação</SubmitButton>
            </form>
          </Card>
          {(a.status === "pending" || a.status === "confirmed") && (
            <Card title="Reagendar">
              <form action={rescheduleAppointmentAdminAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={a.id} />
                <Field label="Data"><input type="date" name="date" defaultValue={local.date} className={inputCls} /></Field>
                <Field label="Horário"><input type="time" name="time" defaultValue={local.time} step={300} className={inputCls} /></Field>
                <div className="sm:col-span-2"><NotifyCheckbox /></div>
                <div><SubmitButton variant="secondary">Reagendar</SubmitButton></div>
              </form>
              <p className="mt-2 text-xs text-silver-dim">O novo horário precisa estar livre conforme as regras da agenda.</p>
            </Card>
          )}
          <Card title="Observações internas">
            <form action={saveAppointmentNotesAction} className="space-y-3">
              <input type="hidden" name="id" value={a.id} />
              <textarea name="internalNotes" defaultValue={a.internalNotes ?? ""} rows={4} className={inputCls} placeholder="Visível apenas para a equipe" />
              <SubmitButton variant="secondary">Salvar</SubmitButton>
            </form>
          </Card>
          <History kind="appointment" id={a.id} tz={tz} labels={APPOINTMENT_STATUS} />
        </div>
      </div>
    </AdminPage>
  );
}
