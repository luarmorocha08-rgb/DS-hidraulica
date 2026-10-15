"use client";

import { CalendarCheck, ClipboardList, MessageSquare, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  { n: "01", icon: MessageSquare, title: "Entre em contato", text: "Descreva o problema do veículo pelo site, WhatsApp ou Instagram." },
  { n: "02", icon: CalendarCheck, title: "Agende uma avaliação", text: "Escolha a melhor data e horário disponível — na oficina ou no seu local." },
  { n: "03", icon: Wrench, title: "Receba atendimento especializado", text: "A equipe realiza a avaliação e informa as possibilidades de serviço." },
  { n: "04", icon: ClipboardList, title: "Acompanhe sua solicitação", text: "Use o protocolo para acompanhar cada atualização do atendimento." },
];

export function HowItWorks() {
  const track = useRef<HTMLOListElement>(null);
  const line = useRef<HTMLDivElement>(null);

  // linha laranja acompanha o scroll e acende cada etapa
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = reduced ? 1 : Math.max(0, Math.min(1, (vh * 0.7 - r.top) / r.height));
      if (line.current) line.current.style.setProperty("--p", String(p));
      items.forEach((it, i) => {
        it.dataset.on = p >= (i + 0.35) / items.length || reduced ? "1" : "0";
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="como-funciona" aria-labelledby="como-titulo" className="relative py-16 md:py-32 overflow-hidden">
      <span aria-hidden className="watermark top-6 left-[-3vw]">PROCESSO</span>
      <div className="container-ds">
        <SectionHeading
          eyebrow="Como trabalhamos"
          title={<span id="como-titulo">Atendimento simples, do contato à entrega.</span>}
          align="center"
        />
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div ref={line} aria-hidden className="absolute bottom-6 left-[27px] top-6 w-[2px] bg-white/10 md:left-1/2 md:-translate-x-1/2">
            <div className="absolute inset-x-0 top-0 h-full origin-top scale-y-[var(--p,0)] bg-gradient-to-b from-orange to-copper shadow-[0_0_18px_rgb(244_119_18/0.8)]" />
          </div>
          <ol ref={track} className="relative space-y-10 md:space-y-16">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                data-step
                data-on="0"
                className={`group relative flex gap-6 md:w-1/2 ${i % 2 ? "md:ml-auto md:pl-14" : "md:flex-row-reverse md:pr-14 md:text-right"}`}
              >
                <span
                  className={`relative z-10 inline-flex size-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-ink text-silver transition-all duration-700 group-data-[on=1]:border-orange group-data-[on=1]:text-orange group-data-[on=1]:shadow-[0_0_24px_rgb(244_119_18/0.55)] md:absolute md:top-0 ${i % 2 ? "md:-left-7" : "md:-right-7"}`}
                >
                  <s.icon className="size-6" aria-hidden />
                </span>
                <div className="transition-all duration-700 group-data-[on=0]:opacity-50">
                  <p className="font-tech text-lg font-semibold tracking-widest text-orange">{s.n}</p>
                  <h3 className="mt-1 font-heading text-2xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-silver">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
