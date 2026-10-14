"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GALLERY_CATEGORIES } from "@/lib/labels";

export interface GalleryEntry {
  id: string;
  title: string;
  description: string | null;
  category: string;
  mediaType: "image" | "video";
  url: string;
  posterUrl: string | null;
  alt: string;
  isDemo: boolean;
}

export function Gallery({ items }: { items: GalleryEntry[] }) {
  const [filter, setFilter] = useState<string>("todos");
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const available = GALLERY_CATEGORIES.filter((c) => items.some((i) => i.category === c.value));
  const visible = filter === "todos" ? items : items.filter((i) => i.category === filter);
  const current = index != null ? visible[index] : null;

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const close = useCallback(() => {
    dialog.current?.close();
    setIndex(null);
  }, []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i == null ? i : (i + d + visible.length) % visible.length)),
    [visible.length],
  );

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  return (
    <section id="galeria" aria-labelledby="galeria-titulo" className="py-24 md:py-32">
      <div className="container-ds">
        <SectionHeading eyebrow="Galeria" title={<span id="galeria-titulo">Nosso trabalho na prática.</span>} />

        {available.length > 1 && (
          <div role="group" aria-label="Filtrar por categoria" className="mt-10 flex gap-2 overflow-x-auto pb-2">
            {[{ value: "todos", label: "Todos" }, ...available].map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={filter === c.value}
                onClick={() => setFilter(c.value)}
                className={clsx(
                  "shrink-0 rounded-full border px-4 py-2 font-heading text-sm font-bold uppercase tracking-wide transition-colors",
                  filter === c.value ? "border-orange bg-orange text-ink" : "border-white/15 text-silver hover:border-orange/60 hover:text-paper",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((item, i) => (
            <li key={item.id} className={clsx(i % 7 === 0 && "md:col-span-2 md:row-span-2")}>
              <button
                type="button"
                onClick={() => open(i)}
                className="group relative block aspect-square w-full overflow-hidden rounded-[12px] border border-white/[0.06] bg-ink-2 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.mediaType === "video" ? (item.posterUrl ?? "") : item.url}
                  alt={item.alt}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-80" />
                {item.mediaType === "video" && (
                  <Play className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-paper" aria-hidden />
                )}
                <span className="absolute inset-x-3 bottom-3 font-heading text-sm font-bold leading-tight md:text-base">{item.title}</span>
                {item.isDemo && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-tech text-[0.68rem] uppercase tracking-wider text-silver">
                    Demonstração
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialog}
        onClose={() => setIndex(null)}
        onClick={(e) => e.target === dialog.current && close()}
        className="m-auto max-h-[92vh] w-[min(1100px,94vw)] rounded-[16px] border border-white/10 bg-ink p-0 text-paper backdrop:bg-black/85 backdrop:backdrop-blur"
        aria-label={current?.title ?? "Visualização"}
      >
        {current && (
          <div className="relative">
            <div className="flex max-h-[72vh] items-center justify-center bg-black">
              {current.mediaType === "video" ? (
                <video src={current.url} poster={current.posterUrl ?? undefined} controls playsInline className="max-h-[72vh] w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={current.alt} className="max-h-[72vh] w-auto object-contain" />
              )}
            </div>
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-heading text-xl font-bold">{current.title}</p>
                {current.description && <p className="mt-1 text-sm text-silver">{current.description}</p>}
                {current.isDemo && <p className="mt-2 font-tech text-xs uppercase tracking-wider text-silver-dim">Imagem de demonstração</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 hover:border-orange">
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Próxima" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 hover:border-orange">
                  <ChevronRight className="size-5" />
                </button>
                <button type="button" onClick={close} aria-label="Fechar" className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-orange hover:text-ink">
                  <X className="size-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
