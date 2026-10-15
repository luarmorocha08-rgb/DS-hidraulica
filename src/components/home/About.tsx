import { BadgeCheck, HandCoins, ShieldCheck, Users, Wrench } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import type { TimelineEntry } from "@/db/schema";
import type { SiteSettings } from "@/lib/settings-schema";
import { BigNumber } from "./BigNumber";

const HIGHLIGHTS = [
  { icon: BadgeCheck, title: "anos de experiência", dynamic: true },
  { icon: Wrench, title: "Especialização em direção hidráulica" },
  { icon: Users, title: "Atendimento profissional" },
  { icon: ShieldCheck, title: "Compromisso com qualidade" },
  { icon: HandCoins, title: "Preço justo" },
];

export function About({ settings, timeline }: { settings: SiteSettings; timeline: TimelineEntry[] }) {
  const years = settings.yearsOfExperience;
  return (
    <section id="sobre" aria-labelledby="sobre-titulo" className="relative overflow-hidden py-16 md:py-36">
      <div className="bg-blueprint absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="container-ds relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 lg:order-1">
          <BigNumber value={years} />
          <p className="mt-2 text-center font-tech text-lg uppercase tracking-[0.4em] text-silver">anos de estrada</p>
        </div>
        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="eyebrow mb-4 flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-orange" /> Sobre a DS Hidráulica
            </p>
            <h2 id="sobre-titulo" className="font-display text-[clamp(2rem,5vw,3.6rem)] leading-[1.02]">
              {settings.about.title}
            </h2>
            <p className="mt-6 max-w-xl text-[1.06rem] leading-relaxed text-silver">{settings.about.text}</p>
          </Reveal>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal as="li" key={h.title} delay={i * 70} className="panel flex items-center gap-4 px-4 py-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange/12 text-orange ring-1 ring-orange/30">
                  <h.icon className="size-5" aria-hidden />
                </span>
                <span className="font-heading text-lg font-bold leading-tight text-paper">
                  {h.dynamic ? `${years} ${h.title}` : h.title}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>

      {settings.about.photos.length > 0 && (
        <div className="container-ds relative mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.about.photos.map((p, i) => (
            <Reveal key={p.url} delay={i * 80} className="panel group relative aspect-[4/3] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
              {p.isDemo && <DemoTag />}
            </Reveal>
          ))}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="container-ds relative mt-24">
          <h3 className="eyebrow mb-8">Nossa trajetória</h3>
          <ol className="relative grid gap-6 border-l border-orange/40 pl-8 md:grid-cols-3 md:border-l-0 md:border-t md:pl-0 md:pt-8">
            {timeline.map((t, i) => (
              <Reveal as="li" key={t.id} delay={i * 90} className="relative">
                <span aria-hidden className="absolute -left-[37px] top-1.5 size-3 rounded-full bg-orange ring-4 ring-orange/20 md:-top-[38px] md:left-0" />
                <p className="font-tech text-xl font-semibold text-orange">{t.period}</p>
                <p className="mt-1 font-heading text-xl font-bold">{t.title}</p>
                <p className="mt-2 text-sm text-silver">{t.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function DemoTag({ label = "Imagem ilustrativa" }: { label?: string }) {
  return (
    <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-tech text-[0.72rem] uppercase tracking-wider text-silver backdrop-blur">
      {label}
    </span>
  );
}
