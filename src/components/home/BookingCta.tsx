import Link from "next/link";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function BookingCta() {
  return (
    <section aria-labelledby="cta-titulo" className="py-12">
      <div className="container-ds">
        <Reveal className="relative overflow-hidden rounded-[22px] border border-orange/25 bg-gradient-to-br from-graphite via-ink-2 to-ink p-8 md:p-14">
          <div aria-hidden className="bg-blueprint absolute inset-0 opacity-50" />
          <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-orange/20 blur-[100px]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="eyebrow">Agendamento online</p>
              <h2 id="cta-titulo" className="mt-3 font-display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.05]">
                Seu caminhão nas mãos de <span className="text-hot">quem entende.</span>
              </h2>
              <p className="mt-4 max-w-xl text-silver">
                Escolha o dia e o horário que funcionam para você, veja apenas horários realmente disponíveis e acompanhe
                tudo pelo protocolo.
              </p>
            </div>
            <div className="grid gap-3">
              <Link href="/agendamento" className={buttonClass("primary", "lg", "animate-pulse-glow")}>
                <CalendarDays className="size-5" aria-hidden /> Agendar atendimento
              </Link>
              <Link href="/visita" className={buttonClass("secondary", "lg")}>
                <MapPin className="size-5" aria-hidden /> Solicitar visita ao local
              </Link>
              <Link href="/acompanhar" className={buttonClass("ghost", "md")}>
                <Search className="size-4" aria-hidden /> Acompanhar uma solicitação
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
