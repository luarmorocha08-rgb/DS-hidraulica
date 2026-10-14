import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHeader } from "@/components/site/PageHeader";
import { getActiveBookingTypes, getServiceBySlug, getSiteSettings } from "@/lib/content";
import { getScheduleSettings } from "@/lib/schedule";
import { todayIn } from "@/lib/time";

export const metadata: Metadata = {
  title: "Agendar atendimento",
  description: "Escolha o dia e o horário disponíveis para atendimento de direção hidráulica na oficina ou no seu local.",
  alternates: { canonical: "/agendamento" },
};

export default async function AgendamentoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const slug = typeof sp.servico === "string" ? sp.servico : null;
  const [types, settings, service, sched] = await Promise.all([
    getActiveBookingTypes(),
    getSiteSettings(),
    slug ? getServiceBySlug(slug) : Promise.resolve(null),
    getScheduleSettings().catch(() => null),
  ]);
  const modality = sp.modalidade === "local" ? "onsite" : sp.modalidade === "oficina" ? "workshop" : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Agendamento online"
        title={<>Agende seu atendimento</>}
        description="Escolha o serviço, a modalidade e um horário livre na agenda. Você recebe um protocolo para acompanhar, reagendar ou cancelar."
      />
      <div className="container-ds py-12 md:py-16">
        <BookingWizard
          types={types.map((t) => ({ id: t.id, name: t.name, description: t.description, durationMinutes: t.durationMinutes, allowWorkshop: t.allowWorkshop, allowOnsite: t.allowOnsite }))}
          service={service ? { id: service.id, name: service.name } : null}
          today={todayIn(sched?.timezone ?? "America/Sao_Paulo")}
          whatsappNumber={settings.whatsappNumber}
          initialModality={modality}
        />
      </div>
    </>
  );
}
