import Link from "next/link";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { CheckCircle2, Circle } from "lucide-react";
import { AdminPage, Card, Flash, Stat } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { appointments, galleryItems, quoteRequests, services, testimonials, visitRequests } from "@/db/schema";
import { appointmentsBetween } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/content";
import { APPOINTMENT_STATUS, MODALITY_LABEL } from "@/lib/labels";
import { emailConfigured, whatsappConfigured } from "@/lib/notifications/channels";
import { formatPhone } from "@/lib/phone";
import { getScheduleSettings } from "@/lib/schedule";
import { addDays, formatDateShort, formatTime, todayIn, zonedToUtc } from "@/lib/time";

export const metadata = { title: "Painel" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ acesso?: string }> }) {
  await requireAdmin("staff");
  const sp = await searchParams;
  const sched = await getScheduleSettings();
  const tz = sched.timezone;
  const today = todayIn(tz);
  const start = zonedToUtc(today, "00:00", tz);
  const tomorrow = zonedToUtc(addDays(today, 1), "00:00", tz);
  const weekEnd = zonedToUtc(addDays(today, 8), "00:00", tz);
  const monthStart = zonedToUtc(`${today.slice(0, 8)}01`, "00:00", tz);

  const [todayList, upcoming, [pend], [visits], [quotes], [doneA], [doneV], settings, [reviewed], [realPhotos], [pubTestimonials]] = await Promise.all([
    appointmentsBetween(start, tomorrow),
    appointmentsBetween(tomorrow, weekEnd),
    db.select({ n: count() }).from(appointments).where(eq(appointments.status, "pending")),
    db.select({ n: count() }).from(visitRequests).where(inArray(visitRequests.status, ["received", "in_review", "awaiting_confirmation"])),
    db.select({ n: count() }).from(quoteRequests).where(inArray(quoteRequests.status, ["new", "in_review", "pending_info"])),
    db.select({ n: count() }).from(appointments).where(and(eq(appointments.status, "completed"), gte(appointments.startsAt, monthStart))),
    db.select({ n: count() }).from(visitRequests).where(and(eq(visitRequests.status, "completed"), gte(visitRequests.updatedAt, monthStart))),
    getSiteSettings(),
    db.select({ total: count(), reviewed: sql<number>`count(*) filter (where ${services.reviewed})` }).from(services),
    db.select({ n: count() }).from(galleryItems).where(and(eq(galleryItems.isDemo, false), eq(galleryItems.published, true))),
    db.select({ n: count() }).from(testimonials).where(eq(testimonials.published, true)),
  ]);

  const active = (s: string) => s === "pending" || s === "confirmed";
  const checklist: Array<[boolean, string, string]> = [
    [!!settings.whatsappNumber, "Número de WhatsApp informado", "/admin/conteudo/empresa"],
    [settings.address.confirmed, "Endereço confirmado para exibição", "/admin/conteudo/empresa"],
    [Number(reviewed.reviewed) === reviewed.total && reviewed.total > 0, `Serviços revisados (${reviewed.reviewed}/${reviewed.total})`, "/admin/conteudo/servicos"],
    [realPhotos.n > 0 || settings.about.photos.length > 0, "Fotos reais da oficina e dos trabalhos", "/admin/conteudo/galeria"],
    [settings.coverage.cities.length > 0 || settings.coverage.radiusKm != null, "Área de atendimento no local configurada", "/admin/conteudo/empresa"],
    [!!settings.seo.city, "Cidade para SEO local", "/admin/conteudo/empresa"],
    [pubTestimonials.n > 0, "Depoimentos reais publicados (opcional)", "/admin/conteudo/depoimentos"],
    [emailConfigured(), "E-mail transacional configurado (RESEND_API_KEY)", "/admin/auditoria"],
    [whatsappConfigured(), "WhatsApp Business Platform configurado", "/admin/auditoria"],
    [!!process.env.NEXT_PUBLIC_HERO_TRUCK_MODEL, "Modelo 3D profissional do caminhão (opcional)", "/admin"],
  ];

  return (
    <AdminPage title="Painel" description={`Hoje: ${formatDateShort(new Date(), tz)}`}>
      {sp.acesso === "negado" && <Flash error="Seu perfil não tem acesso a essa área." />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Agendamentos hoje" value={todayList.filter((a) => active(a.status)).length} href="/admin/agenda" />
        <Stat label="Próximos 7 dias" value={upcoming.filter((a) => active(a.status)).length} href="/admin/agenda" />
        <Stat label="Aguardando confirmação" value={pend.n} tone={pend.n ? "warning" : "default"} href="/admin/agendamentos?status=pending" />
        <Stat label="Visitas a responder" value={visits.n} tone={visits.n ? "warning" : "default"} href="/admin/visitas" />
        <Stat label="Orçamentos pendentes" value={quotes.n} tone={quotes.n ? "warning" : "default"} href="/admin/orcamentos" />
        <Stat label="Concluídos no mês" value={doneA.n + doneV.n} tone="success" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Agenda de hoje" actions={<Link href="/admin/agenda/novo" className="text-sm text-orange hover:underline">+ Novo agendamento</Link>}>
            <AppointmentList items={todayList} tz={tz} empty="Nenhum atendimento hoje." />
          </Card>
          <Card title="Próximos atendimentos">
            <AppointmentList items={upcoming.filter((a) => active(a.status)).slice(0, 10)} tz={tz} withDate empty="Nada agendado para os próximos dias." />
          </Card>
        </div>
        <Card title="Checklist de lançamento">
          <p className="mb-4 text-sm text-silver-dim">Itens que dependem da DS Hidráulica antes de divulgar o site.</p>
          <ul className="space-y-2.5">
            {checklist.map(([ok, label, href]) => (
              <li key={label}>
                <Link href={href} className="flex items-start gap-2.5 text-sm hover:text-orange">
                  {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-silver-dim" />}
                  <span className={ok ? "text-silver-dim line-through" : ""}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminPage>
  );
}

function AppointmentList({ items, tz, withDate, empty }: { items: Awaited<ReturnType<typeof appointmentsBetween>>; tz: string; withDate?: boolean; empty: string }) {
  if (!items.length) return <p className="text-sm text-silver-dim">{empty}</p>;
  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map((a) => (
        <li key={a.id}>
          <Link href={`/admin/agendamentos/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-orange">
            <span className="w-28 font-tech text-lg font-semibold">
              {withDate && <span className="mr-1 text-sm text-silver-dim">{formatDateShort(a.startsAt, tz).slice(0, 5)}</span>}
              {formatTime(a.startsAt, tz)}
            </span>
            <span className="min-w-40 flex-1">
              <span className="block font-semibold">{a.customerName}</span>
              <span className="text-xs text-silver-dim">
                {a.typeName} · {MODALITY_LABEL[a.modality]}
                {a.vehicle ? ` · ${a.vehicleBrand} ${a.vehicle}` : ""} · {formatPhone(a.customerPhone)}
              </span>
            </span>
            <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
