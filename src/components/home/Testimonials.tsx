"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { useRef } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatCalendarDate } from "@/lib/time";

export interface TestimonialEntry {
  id: string;
  name: string;
  rating: number;
  comment: string;
  reviewDate: string;
  serviceName: string | null;
  source: string | null;
  sourceUrl: string | null;
}

export function Testimonials({ items }: { items: TestimonialEntry[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section id="depoimentos" aria-labelledby="dep-titulo" className="py-24 md:py-32">
      <div className="container-ds">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Depoimentos" title={<span id="dep-titulo">Quem confia na DS Hidráulica.</span>} />
          <div className="hidden shrink-0 gap-2 md:flex">
            <button type="button" onClick={() => scroll(-1)} aria-label="Depoimentos anteriores" className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-orange hover:text-orange">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label="Próximos depoimentos" className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 hover:border-orange hover:text-orange">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        <ul ref={scroller} className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
          {items.map((t) => (
            <li key={t.id} className="panel flex w-[85%] shrink-0 snap-start flex-col p-6 sm:w-[46%] lg:w-[31.5%]">
              <div className="flex gap-0.5 text-orange" aria-label={`${t.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="size-4" fill={i < t.rating ? "currentColor" : "none"} aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-paper/90">“{t.comment}”</blockquote>
              <footer className="mt-6 border-t border-white/[0.06] pt-4 text-sm">
                <p className="font-heading text-lg font-bold">{t.name}</p>
                <p className="text-silver-dim">
                  {formatCalendarDate(t.reviewDate)}
                  {t.serviceName ? ` · ${t.serviceName}` : ""}
                </p>
                {t.source && (
                  <p className="mt-1 text-xs text-silver-dim">
                    {t.sourceUrl ? (
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-orange">
                        Avaliação publicada no {t.source} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : (
                      `Fonte: ${t.source}`
                    )}
                  </p>
                )}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
