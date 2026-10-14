import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };

export default function TermsPage() {
  return (
    <>
      <PageHeader eyebrow="Termos" title="Termos de uso" />
      <div className="container-ds max-w-3xl space-y-8 py-12 leading-relaxed text-paper/90 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold">
        <section><h2>Agendamentos</h2><p>O horário escolhido no site fica reservado. Quando a situação indicar “aguardando confirmação”, o atendimento só está garantido após a confirmação da equipe. Reagendamentos e cancelamentos podem ser feitos pela página Acompanhar, dentro do prazo indicado.</p></section>
        <section><h2>Visitas ao local</h2><p>Dependem da disponibilidade da equipe e da área atendida e podem ter custo de deslocamento, sempre informado antes da confirmação. A solicitação pelo site não garante atendimento imediato.</p></section>
        <section><h2>Diagnóstico preliminar</h2><p>A ferramenta “O que está acontecendo com sua direção?” oferece apenas orientações gerais e não substitui a avaliação de um mecânico. Em caso de sintoma grave, não continue dirigindo e procure assistência profissional.</p></section>
        <section><h2>Orçamentos</h2><p>Valores são informados pela equipe após análise das informações e, quando necessário, do componente. O site não apresenta preços automáticos.</p></section>
        <section><h2>Conteúdo</h2><p>Imagens identificadas como ilustrativas ou de demonstração não retratam serviços realizados pela empresa.</p></section>
        <p className="text-sm text-silver-dim">Modelo a ser revisado pela DS Hidráulica antes da publicação.</p>
      </div>
    </>
  );
}
