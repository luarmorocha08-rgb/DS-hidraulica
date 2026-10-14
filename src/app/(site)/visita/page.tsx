import type { Metadata } from "next";
import { VisitForm } from "@/components/forms/RequestForms";
import { PageHeader } from "@/components/site/PageHeader";
import { getSiteSettings } from "@/lib/content";
import { todayIn } from "@/lib/time";

export const metadata: Metadata = {
  title: "Solicitar visita ao local",
  description: "Peça uma visita técnica da DS Hidráulica no local onde está o seu caminhão ou ônibus.",
  alternates: { canonical: "/visita" },
};

export default async function VisitaPage() {
  const settings = await getSiteSettings();
  const coverage = settings.coverage.description || (settings.coverage.cities.length ? `Atendemos: ${settings.coverage.cities.join(", ")}.` : "");
  return (
    <>
      <PageHeader
        eyebrow="Visita técnica"
        title="Solicitar visita ao local"
        description={
          <>
            Informe onde está o veículo e o que está acontecendo. A equipe avalia o endereço, a disponibilidade e confirma com você.
            {coverage && <span className="mt-2 block text-sm text-silver-dim">{coverage}</span>}
          </>
        }
      />
      <div className="container-ds max-w-4xl py-12 md:py-16">
        <VisitForm whatsappNumber={settings.whatsappNumber} today={todayIn("America/Sao_Paulo")} />
      </div>
    </>
  );
}
