import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-ds flex min-h-[70svh] flex-col items-start justify-center pt-28">
      <p className="eyebrow">Erro 404</p>
      <h1 className="mt-3 font-display text-4xl md:text-6xl">Página não encontrada.</h1>
      <p className="mt-4 text-silver">O endereço pode ter mudado. Que tal voltar ao início ou agendar um atendimento?</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("secondary", "md")}>Ir para o início</Link>
        <Link href="/agendamento" className={buttonClass("primary", "md")}>Agendar atendimento</Link>
      </div>
    </div>
  );
}
