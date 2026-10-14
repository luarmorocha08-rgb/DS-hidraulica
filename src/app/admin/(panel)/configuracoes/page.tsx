import { asc } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { bookingTypes } from "@/db/schema";
import { saveBookingTypeAction, saveBusinessHoursAction, saveScheduleSettingsAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { WEEKDAY_NAMES } from "@/lib/labels";
import { getBusinessHours, getScheduleSettings } from "@/lib/schedule";

export const metadata = { title: "Horários e regras" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const [hours, rules, types] = await Promise.all([getBusinessHours(), getScheduleSettings(), db.select().from(bookingTypes).orderBy(asc(bookingTypes.sortOrder))]);
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <AdminPage title="Horários e regras da agenda" description="Tudo que define os horários oferecidos no agendamento online.">
      <Flash msg={sp.msg} error={sp.error} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Dias e horário de funcionamento">
          <form action={saveBusinessHoursAction} className="space-y-3">
            {order.map((d) => {
              const h = hours[d];
              return (
                <fieldset key={d} className="grid grid-cols-[110px_1fr] items-center gap-3 border-b border-white/[0.05] pb-3 sm:grid-cols-[120px_repeat(4,1fr)]">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" name={`open_${d}`} defaultChecked={h?.isOpen} className="accent-[#f47712]" /> {WEEKDAY_NAMES[d]}
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <input type="time" aria-label="Abertura" name={`start_${d}`} defaultValue={h?.openTime ?? "08:00"} className={inputCls} />
                    <input type="time" aria-label="Fechamento" name={`end_${d}`} defaultValue={h?.closeTime ?? "18:00"} className={inputCls} />
                    <input type="time" aria-label="Início do intervalo" name={`bstart_${d}`} defaultValue={h?.breakStart ?? ""} className={inputCls} />
                    <input type="time" aria-label="Fim do intervalo" name={`bend_${d}`} defaultValue={h?.breakEnd ?? ""} className={inputCls} />
                  </div>
                </fieldset>
              );
            })}
            <p className="text-xs text-silver-dim">Colunas: abertura · fechamento · início do intervalo · fim do intervalo (deixe o intervalo vazio se não houver).</p>
            <SubmitButton>Salvar horários</SubmitButton>
          </form>
        </Card>
        <Card title="Regras de agendamento">
          <form action={saveScheduleSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Intervalo entre horários oferecidos (min)"><input type="number" name="slotIntervalMinutes" defaultValue={rules.slotIntervalMinutes} min={5} className={inputCls} /></Field>
            <Field label="Folga entre atendimentos (min)"><input type="number" name="bufferMinutes" defaultValue={rules.bufferMinutes} min={0} className={inputCls} /></Field>
            <Field label="Atendimentos simultâneos"><input type="number" name="capacity" defaultValue={rules.capacity} min={1} className={inputCls} /></Field>
            <Field label="Antecedência mínima (horas)"><input type="number" name="minLeadHours" defaultValue={rules.minLeadHours} min={0} className={inputCls} /></Field>
            <Field label="Agenda aberta para (dias)"><input type="number" name="maxDaysAhead" defaultValue={rules.maxDaysAhead} min={1} className={inputCls} /></Field>
            <Field label="Cliente pode alterar até (horas antes)"><input type="number" name="customerChangeLeadHours" defaultValue={rules.customerChangeLeadHours} min={0} className={inputCls} /></Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="autoConfirmWorkshop" defaultChecked={rules.autoConfirmWorkshop} className="mt-1 accent-[#f47712]" />
              Confirmar automaticamente agendamentos na oficina (visitas ao local sempre aguardam análise)
            </label>
            <div><SubmitButton>Salvar regras</SubmitButton></div>
          </form>
        </Card>
        <Card title="Tipos de atendimento e duração" className="xl:col-span-2">
          <div className="space-y-4">
            {[...types, null].map((t) => (
              <form key={t?.id ?? "new"} action={saveBookingTypeAction} className="grid items-end gap-3 rounded-md border border-white/[0.06] p-3 md:grid-cols-[1.2fr_2fr_110px_auto_auto_auto_80px_auto]">
                {t && <input type="hidden" name="id" value={t.id} />}
                <Field label={t ? "Nome" : "Novo tipo"}><input name="name" defaultValue={t?.name} required className={inputCls} /></Field>
                <Field label="Descrição"><input name="description" defaultValue={t?.description ?? ""} className={inputCls} /></Field>
                <Field label="Duração (min)"><input type="number" name="durationMinutes" defaultValue={t?.durationMinutes ?? 60} min={10} className={inputCls} /></Field>
                <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" name="allowWorkshop" defaultChecked={t?.allowWorkshop ?? true} className="accent-[#f47712]" /> Oficina</label>
                <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" name="allowOnsite" defaultChecked={t?.allowOnsite ?? true} className="accent-[#f47712]" /> No local</label>
                <label className="flex items-center gap-1.5 pb-2 text-xs"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} className="accent-[#f47712]" /> Ativo</label>
                <Field label="Ordem"><input type="number" name="sortOrder" defaultValue={t?.sortOrder ?? types.length} className={inputCls} /></Field>
                <SubmitButton variant={t ? "secondary" : "primary"}>{t ? "Salvar" : "Adicionar"}</SubmitButton>
              </form>
            ))}
          </div>
        </Card>
      </div>
    </AdminPage>
  );
}
