import Link from "next/link";
import { ArrowUpRight, CalendarDays, FileText, MapPin } from "lucide-react";
import { ServiceIcon } from "@/components/brand/ServiceIcon";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Service } from "@/db/schema";
import { DemoTag } from "./About";
import { TiltCard } from "./TiltCard";

export function Services({ services }: { services: Service[] }) {
  return (
    <section id="servicos" aria-labelledby="servicos-titulo" className="relative py-24 md:py-32">
      <div className="container-ds">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Serviços"
            title={
              <span id="servicos-titulo">
                Soluções completas em <span className="text-hot">direção hidráulica</span>
              </span>
            }
            description="Caminhões, ônibus e veículos pesados. Do diagnóstico à montagem final, cada componente recebe a atenção de quem é especialista."
          />
          <Reveal className="flex shrink-0 flex-wrap gap-3">
            <Link href="/visita" className={buttonClass("secondary", "md")}>
              <MapPin className="size-4" aria-hidden /> Solicitar visita ao local
            </Link>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s, i) => (
            <Reveal as="li" key={s.id} delay={(i % 3) * 90}>
              <TiltCard className="h-full">
                <article className="panel group relative flex h-full flex-col overflow-hidden">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgb(244 119 18 / 0.14), transparent 60%)" }}
                  />
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.06] bg-ink-2">
                    {s.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.imageUrl}
                          alt={s.imageAlt ?? s.name}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.07]"
                        />
                        {s.isDemoImage && <DemoTag />}
                      </>
                    ) : (
                      <div className="bg-blueprint relative flex size-full items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgb(244_119_18/0.18),transparent_65%)]" />
                        <ServiceIcon
                          name={s.icon}
                          className="relative size-20 text-silver/80 transition-transform duration-700 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:text-orange"
                        />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 font-tech text-sm font-semibold text-silver/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative flex flex-1 flex-col p-6">
                    <h3 className="font-heading text-[1.45rem] font-bold leading-tight">
                      <Link href={`/servicos/${s.slug}`} className="after:absolute after:inset-0 hover:text-orange">
                        {s.name}
                      </Link>
                    </h3>
                    <p className="mt-2.5 text-[0.95rem] text-silver">{s.shortDescription}</p>
                    {s.benefits.length > 0 && (
                      <ul className="mt-4 space-y-1.5 text-sm text-paper/90">
                        {s.benefits.slice(0, 3).map((b) => (
                          <li key={b} className="flex gap-2">
                            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" /> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.symptoms.length > 0 && (
                      <p className="mt-4 font-tech text-[0.88rem] uppercase tracking-wider text-silver-dim">
                        Sintomas: {s.symptoms.join(" · ")}
                      </p>
                    )}
                    <div className="relative z-10 mt-auto grid grid-cols-2 gap-2 pt-6">
                      <Link href={`/orcamento?servico=${s.slug}`} className={buttonClass("secondary", "sm")}>
                        <FileText className="size-4" aria-hidden /> Orçamento
                      </Link>
                      <Link href={`/agendamento?servico=${s.slug}`} className={buttonClass("primary", "sm")}>
                        <CalendarDays className="size-4" aria-hidden /> Agendar
                      </Link>
                    </div>
                    <ArrowUpRight
                      aria-hidden
                      className="absolute right-5 top-6 size-5 text-silver-dim transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange"
                    />
                  </div>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
