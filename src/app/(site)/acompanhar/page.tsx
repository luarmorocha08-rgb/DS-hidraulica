import type { Metadata } from "next";
import { TrackPanel } from "@/components/booking/TrackPanel";
import { PageHeader } from "@/components/site/PageHeader";
import { todayIn } from "@/lib/time";

export const metadata: Metadata = {
  title: "Acompanhar solicitação",
  description: "Consulte o andamento do seu agendamento, visita ou orçamento pelo protocolo.",
  robots: { index: false },
};

export default async function AcompanharPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const protocol = typeof sp.protocolo === "string" ? sp.protocolo.slice(0, 20) : "";
  return (
    <>
      <PageHeader eyebrow="Acompanhamento" title="Acompanhe sua solicitação" description="Informe o protocolo e o telefone usados no pedido para ver a situação, reagendar ou cancelar." />
      <div className="container-ds py-12 md:py-16">
        <TrackPanel initialProtocol={protocol} today={todayIn("America/Sao_Paulo")} />
      </div>
    </>
  );
}
