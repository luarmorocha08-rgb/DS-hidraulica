import type { Metadata } from "next";
import { QuoteForm } from "@/components/forms/RequestForms";
import { PageHeader } from "@/components/site/PageHeader";
import { getPublishedServices, getServiceBySlug, getSiteSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Orçamento online",
  description: "Peça um orçamento de manutenção de direção hidráulica para caminhões e ônibus. Envie fotos do componente.",
  alternates: { canonical: "/orcamento" },
};

export default async function OrcamentoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [settings, services, selected] = await Promise.all([
    getSiteSettings(),
    getPublishedServices(),
    typeof sp.servico === "string" ? getServiceBySlug(sp.servico) : Promise.resolve(null),
  ]);
  return (
    <>
      <PageHeader eyebrow="Orçamento" title="Solicite um orçamento" description="Descreva o problema e, se puder, envie fotos. A equipe analisa e responde com o orçamento ou com perguntas." />
      <div className="container-ds max-w-4xl py-12 md:py-16">
        <QuoteForm whatsappNumber={settings.whatsappNumber} services={services.map((s) => s.name)} defaultService={selected?.name} />
      </div>
    </>
  );
}
