"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowDown, CalendarDays, ChevronDown, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";
import { HeroPoster, HeroSequence } from "./HeroSequence";
import { detectQuality, type Quality } from "./quality";
import { band, CAPTIONS, explodeAmount, STAGE } from "./timeline";
import { GEAR_PARTS } from "./gear/SteeringGear";
import { gearOpacity, HERO_PHOTO_SRC, TruckPhotoStage, type PhotoStageApi } from "./TruckPhotoStage";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const TRUCK_URL = process.env.NEXT_PUBLIC_HERO_TRUCK_MODEL || undefined;
const GEAR_URL = process.env.NEXT_PUBLIC_HERO_GEAR_MODEL || undefined;
const SEQUENCE_DIR = process.env.NEXT_PUBLIC_HERO_SEQUENCE_DIR || "/hero/sequence";

const RAIL = [
  { label: "Apresentação", at: 0 },
  { label: "Aproximação", at: STAGE.introEnd },
  { label: "Revelação", at: STAGE.approachEnd },
  { label: "Desmontagem", at: STAGE.revealEnd },
  { label: "Remontagem", at: STAGE.holdEnd },
];

export function HeroExperience({ title, subtitle }: { title: string; subtitle: string }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  const intro = useRef<HTMLDivElement>(null);
  const finale = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const legend = useRef<HTMLDivElement>(null);
  const captions = useRef<Record<string, HTMLDivElement | null>>({});
  const railFill = useRef<HTMLDivElement>(null);
  const railItems = useRef<Array<HTMLLIElement | null>>([]);
  const labels = useRef<Record<string, HTMLElement | null>>({});
  const photoApi = useRef<PhotoStageApi>(null);
  const gearLayer = useRef<HTMLDivElement>(null);
  // a foto do caminhão (public/hero/caminhao.jpg) é o visual principal; sem ela, caminhão 3D
  const [photo, setPhoto] = useState<"loading" | "ok" | "missing">("loading");
  const [gearOn, setGearOn] = useState(false);

  useEffect(() => {
    setQuality(detectQuality());
    const im = new Image();
    im.onload = () => setPhoto("ok");
    im.onerror = () => setPhoto("missing");
    im.src = HERO_PHOTO_SRC;
  }, []);

  // progresso do scroll → cena, textos e indicador
  useEffect(() => {
    if (!quality || quality === "static" || !section.current || photo === "loading") return;
    let kill: (() => void) | undefined;
    let cancelled = false;
    const withPhoto = photo === "ok";

    const apply = (p: number) => {
      progress.current = p;
      if (withPhoto) {
        photoApi.current?.update(p);
        const g = gearOpacity(p);
        if (gearLayer.current) gearLayer.current.style.opacity = String(g);
        // a cena 3D só renderiza enquanto aparece
        setGearOn(g > 0.001);
      }
      const setBlock = (el: HTMLElement | null, o: number, y = 18) => {
        if (!el) return;
        el.style.opacity = String(o);
        el.style.transform = `translate3d(0, ${(1 - o) * y}px, 0)`;
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
        if (o < 0.5) el.setAttribute("inert", "");
        else el.removeAttribute("inert");
      };
      setBlock(intro.current, band(p, -1, STAGE.introEnd - 0.02, 0.05), -24);
      setBlock(hint.current, 1 - Math.min(1, p / 0.04), 0);
      CAPTIONS.forEach((c) => setBlock(captions.current[c.id], band(p, c.a, c.b)));
      setBlock(finale.current, band(p, STAGE.reassembleEnd + 0.01, 2, 0.04));
      setBlock(legend.current, Math.min(1, explodeAmount(p) * 1.4) * band(p, STAGE.revealEnd, STAGE.holdEnd + 0.04), 10);
      if (railFill.current) railFill.current.style.transform = `scaleY(${p})`;
      railItems.current.forEach((li, i) => {
        if (li) li.dataset.on = p >= RAIL[i].at - 0.001 ? "1" : "0";
      });
    };

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled || !section.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => apply(self.progress),
        onToggle: (self) => setVisible(self.isActive || self.progress < 1),
      });
      apply(st.progress);
      kill = () => st.kill();
    })();

    // pausa a renderização quando a seção sai da tela
    const io = new IntersectionObserver((e) => setVisible(e[0].isIntersecting), { rootMargin: "100px" });
    io.observe(section.current);

    return () => {
      cancelled = true;
      kill?.();
      io.disconnect();
    };
  }, [quality, photo]);

  const withPhoto = photo === "ok";
  const isStatic = quality === "static";
  const use3d = quality === "high" || quality === "medium";

  return (
    <section
      id="inicio"
      ref={section}
      aria-label="Apresentação"
      className={clsx("relative", isStatic ? "h-auto" : "h-[620vh] motion-reduce:h-auto")}
    >
      <div
        className={clsx(
          "top-0 w-full overflow-hidden",
          isStatic ? "relative min-h-svh" : "sticky h-svh motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh",
        )}
      >
        {/* fundo: oficina escura com iluminação laranja e linhas técnicas */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,#2a1405_0%,#0a0a0a_55%)]" />
        <div aria-hidden className="bg-blueprint absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        {/* visual principal: foto do caminhão animada */}
        {withPhoto && quality && <TruckPhotoStage ref={photoApi} interactive={!isStatic} />}

        {/* caixa de direção 3D (ou caminhão 3D completo quando não há foto) */}
        {photo !== "loading" && !isStatic && (
          <div
            ref={gearLayer}
            aria-hidden
            className={clsx("absolute inset-0", !withPhoto && "transition-opacity duration-1000", !withPhoto && use3d && !ready && "opacity-0")}
            style={withPhoto ? { opacity: 0 } : undefined}
          >
            {use3d && (
              <HeroCanvas
                progress={progress}
                quality={quality}
                active={visible && (!withPhoto || gearOn || !ready)}
                truckUrl={TRUCK_URL}
                gearUrl={GEAR_URL}
                onReady={() => setReady(true)}
                labels={labels}
                vehicle={withPhoto ? "photo" : "procedural"}
              />
            )}
            {quality === "low" && <HeroSequence progress={progress} dir={SEQUENCE_DIR} active={visible && (!withPhoto || gearOn)} />}
          </div>
        )}
        {isStatic && !withPhoto && <HeroPoster src="/hero/poster-exploded.jpg" className="opacity-80" />}
        {use3d && !ready && !withPhoto && <HeroPoster className="opacity-60 blur-[2px]" />}

        {/* etiquetas técnicas da vista explodida (posicionadas pela cena 3D) */}
        {use3d && (
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
            {GEAR_PARTS.filter((p) => p.label).map((p) => (
              <div key={p.id} ref={(el) => void (labels.current[p.id] = el)} className="gear-label absolute left-0 top-0" style={{ opacity: 0 }}>
                <div className="gear-label__inner">
                  <span className="gear-label__dot" />
                  <span className="gear-label__line" />
                  <span className="gear-label__text">{p.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* vinhetas para legibilidade */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/10 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        {/* 1 — apresentação */}
        <div
          ref={intro}
          className={clsx(
            isStatic
              ? "relative flex min-h-[78svh] items-end pb-12 pt-32 md:items-center"
              : "absolute inset-x-0 bottom-0 top-[72px] flex items-end pb-[max(7rem,14vh)] md:items-center md:pb-0",
          )}
        >
          <div className="container-ds">
            <div className="max-w-2xl">
              <Logo className="mb-6 hidden h-28 w-auto drop-shadow-[0_6px_30px_rgb(0_0_0/0.6)] md:block" />
              <h1 className="font-display text-[clamp(2.2rem,6.2vw,4.8rem)] leading-[0.98] tracking-tight">
                {renderTitle(title)}
              </h1>
              <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-silver md:text-lg">{subtitle}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="#servicos" className={buttonClass("secondary", "lg")}>
                  <Wrench className="size-5" aria-hidden /> Conhecer nossos serviços
                </Link>
                <Link href="/agendamento" className={buttonClass("primary", "lg")}>
                  <CalendarDays className="size-5" aria-hidden /> Agendar atendimento
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 2–5 — legendas da narrativa */}
        {!isStatic &&
          CAPTIONS.map((c) => (
            <div
              key={c.id}
              ref={(el) => void (captions.current[c.id] = el)}
              style={{ opacity: 0, visibility: "hidden" }}
              className={clsx(
                "absolute inset-x-0 top-[96px]",
                c.compact ? "md:top-[104px]" : "md:top-1/2 md:-translate-y-1/2",
              )}
            >
              <div className="container-ds">
                <div
                  className={clsx(
                    "rounded-[14px] border border-white/[0.07] bg-black/45 p-5 backdrop-blur-md md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0",
                    c.compact ? "max-w-xl" : "max-w-md",
                  )}
                >
                  <p className="eyebrow">{c.kicker}</p>
                  <p
                    className={clsx(
                      "mt-2 font-display leading-[1.05]",
                      c.compact ? "text-[clamp(1.4rem,2.4vw,2rem)]" : "text-[clamp(1.5rem,3.2vw,2.5rem)]",
                    )}
                  >
                    {c.title}
                  </p>
                  <p className="mt-3 text-sm text-silver md:text-base">{c.text}</p>
                </div>
              </div>
            </div>
          ))}

        {/* legenda de componentes no celular (no desktop as etiquetas ficam no 3D) */}
        {!isStatic && (
          <div ref={legend} style={{ opacity: 0, visibility: "hidden" }} className="absolute inset-x-0 bottom-24 md:hidden">
            <ul className="container-ds flex flex-wrap gap-1.5">
              {GEAR_PARTS.filter((p) => p.label).map((p) => (
                <li key={p.id} className="rounded-full border border-orange/40 bg-black/60 px-2.5 py-1 font-tech text-xs uppercase tracking-wide text-paper backdrop-blur">
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6 — frase final */}
        <div
          ref={finale}
          style={isStatic ? undefined : { opacity: 0, visibility: "hidden" }}
          className={clsx(
            isStatic ? "relative pb-24" : "absolute inset-x-0 bottom-[max(6rem,12vh)]",
          )}
        >
          <div className="container-ds">
            <p className="font-display text-[clamp(2rem,5.4vw,4.2rem)] leading-[1]">
              PRECISÃO EM <span className="text-hot">CADA COMPONENTE.</span>
            </p>
            <p className="mt-4 text-lg text-silver">Conheça as soluções da DS Hidráulica.</p>
            <Link href="#servicos" className={buttonClass("primary", "lg", "mt-7")}>
              Ver serviços <ArrowDown className="size-5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* indicador de etapas */}
        {!isStatic && (
          <div aria-hidden className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
            <div className="relative pr-5">
              <div className="absolute bottom-1 right-0 top-1 w-px bg-white/15">
                <div ref={railFill} className="absolute inset-0 origin-top scale-y-0 bg-orange shadow-[0_0_12px_#f47712]" />
              </div>
              <ol className="space-y-7 text-right">
                {RAIL.map((r, i) => (
                  <li
                    key={r.label}
                    ref={(el) => void (railItems.current[i] = el)}
                    data-on={i === 0 ? "1" : "0"}
                    className="group font-tech text-xs uppercase tracking-[0.2em] text-silver-dim transition-colors data-[on=1]:text-paper"
                  >
                    {r.label}
                    <span className="absolute -right-[3.5px] mt-1.5 size-2 rounded-full bg-white/25 transition-colors group-data-[on=1]:bg-orange" />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {!isStatic && (
          <div ref={hint} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-silver-dim md:flex">
            <span className="font-tech text-xs uppercase tracking-[0.3em]">Role para explorar</span>
            <ChevronDown className="size-5 animate-bounce" aria-hidden />
          </div>
        )}
      </div>
    </section>
  );
}

function renderTitle(title: string) {
  // destaca "DIREÇÃO HIDRÁULICA" quando presente
  const key = "DIREÇÃO HIDRÁULICA";
  const i = title.toUpperCase().indexOf(key);
  if (i < 0) return <span className="text-metal">{title}</span>;
  return (
    <>
      <span className="text-metal">{title.slice(0, i)}</span>
      <span className="text-hot">{title.slice(i, i + key.length)}</span>
      <span className="text-metal">{title.slice(i + key.length)}</span>
    </>
  );
}
