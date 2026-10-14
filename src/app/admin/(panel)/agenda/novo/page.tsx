import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { createManualAppointmentAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { getActiveBookingTypes } from "@/lib/content";
import { VEHICLE_TYPES } from "@/lib/labels";

export const metadata = { title: "Novo agendamento" };

export default async function NewAppointment({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin("staff");
  const { error } = await searchParams;
  const types = await getActiveBookingTypes();
  return (
    <AdminPage title="Novo agendamento" description="Para clientes que ligaram ou chegaram pelo WhatsApp. O horário precisa estar livre na agenda." back={{ href: "/admin/agenda", label: "Agenda" }}>
      <Flash error={error} />
      <form action={createManualAppointmentAction} className="grid gap-6 lg:grid-cols-2">
        <Card title="Atendimento">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo" className="sm:col-span-2">
              <select name="bookingTypeId" className={inputCls} required>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.durationMinutes} min)</option>)}
              </select>
            </Field>
            <Field label="Modalidade">
              <select name="modality" className={inputCls}>
                <option value="workshop">Na oficina</option>
                <option value="onsite">No local</option>
              </select>
            </Field>
            <Field label="Data"><input type="date" name="date" required className={inputCls} /></Field>
            <Field label="Horário"><input type="time" name="time" required step={300} className={inputCls} /></Field>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="pending" className="accent-[#f47712]" /> Deixar aguardando confirmação</label>
            <Field label="Problema" className="sm:col-span-2"><textarea name="problemDescription" required minLength={10} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Cliente e veículo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2"><input name="name" required className={inputCls} /></Field>
            <Field label="Telefone"><input name="phone" required className={inputCls} /></Field>
            <Field label="E-mail"><input name="email" type="email" className={inputCls} /></Field>
            <Field label="Tipo de veículo">
              <select name="vehicleType" className={inputCls}>{VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select>
            </Field>
            <Field label="Marca"><input name="vehicleBrand" required className={inputCls} /></Field>
            <Field label="Modelo"><input name="vehicleModel" required className={inputCls} /></Field>
            <Field label="Ano"><input name="vehicleYear" inputMode="numeric" className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Endereço (somente atendimento no local)" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Rua" className="sm:col-span-2"><input name="street" className={inputCls} /></Field>
            <Field label="Número"><input name="number" className={inputCls} /></Field>
            <Field label="Bairro"><input name="district" className={inputCls} /></Field>
            <Field label="Cidade"><input name="city" className={inputCls} /></Field>
            <Field label="UF"><input name="state" maxLength={2} className={inputCls} /></Field>
          </div>
        </Card>
        <div className="lg:col-span-2"><SubmitButton>Criar agendamento</SubmitButton></div>
      </form>
    </AdminPage>
  );
}
