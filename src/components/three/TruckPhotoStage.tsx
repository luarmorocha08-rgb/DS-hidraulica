"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { ramp, smooth, STAGE } from "./timeline";

/**
 * Foto do caminhão (public/hero/caminhao.jpg) animada pelo scroll.
 * Pontos de interesse em fração da imagem ORIGINAL (sem espelhar).
 * Ao trocar a foto, ajuste STEERING e HEADLIGHTS para a nova imagem.
 */
export const HERO_PHOTO_SRC = process.env.NEXT_PUBLIC_HERO_TRUCK_PHOTO || "/hero/caminhao.jpg";
const STEERING = { x: 0.37, y: 0.62 };
const HEADLIGHTS = [{ x: 0.228, y: 0.685 }];
/** No desktop a foto é espelhada para o caminhão ficar à direita do texto. */
const MIRROR_ON_DESKTOP = true;

export interface PhotoStageApi {
  update: (p: number) => void;
}

/** Quanto a foto está aproximada da caixa de direção (0 → 1 → 0). */
export function photoZoom(p: number) {
  return smooth(ramp(p, STAGE.introEnd, STAGE.approachEnd + 0.02)) * (1 - smooth(ramp(p, STAGE.reassembleEnd - 0.02, 0.98)));
}
/** Opacidade da foto (dá lugar à caixa 3D e volta no final). */
export function photoOpacity(p: number) {
  return Math.min(1, 1 - smooth(ramp(p, STAGE.approachEnd - 0.03, STAGE.approachEnd + 0.06)) + smooth(ramp(p, STAGE.reassembleEnd - 0.02, STAGE.reassembleEnd + 0.06)));
}
export function gearOpacity(p: number) {
  return 1 - photoOpacity(p);
}

interface Layout {
  cw: number;
  ch: number;
  dw: number;
  dh: number;
  ox: number;
  oy: number;
  mirror: boolean;
  wide: boolean;
}

export function TruckPhotoStage({ ref, interactive = true }: { ref?: Ref<PhotoStageApi>; interactive?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const layout = useRef<Layout | null>(null);
  const lastP = useRef(0);

  const measure = () => {
    const el = root.current;
    const im = img.current;
    if (!el || !im || !im.naturalWidth) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const ar = im.naturalWidth / im.naturalHeight;
    const wide = cw / ch > 1.15;
    let dw: number, dh: number, ox: number, oy: number;
    if (wide) {
      dh = ch * 1.04;
      dw = dh * ar;
      if (dw < cw * 0.8) {
        dw = cw * 0.8;
        dh = dw / ar;
      }
      ox = cw - dw * 0.98;
      oy = ch - dh + ch * 0.03;
    } else {
      dw = cw * 1.7;
      dh = dw / ar;
      ox = -dw * 0.06;
      oy = Math.max(60, ch * 0.08);
    }
    const mirror = wide && MIRROR_ON_DESKTOP;
    layout.current = { cw, ch, dw, dh, ox, oy, mirror, wide };
    const st = stage.current!;
    st.style.width = `${dw}px`;
    st.style.height = `${dh}px`;
    st.style.left = `${ox}px`;
    st.style.top = `${oy}px`;
    im.style.transform = mirror ? "scaleX(-1)" : "";
    // posiciona overlays (faróis) no espaço da imagem exibida
    st.querySelectorAll<HTMLElement>("[data-poi]").forEach((node) => {
      const [x, y] = node.dataset.poi!.split(",").map(Number);
      node.style.left = `${(mirror ? 1 - x : x) * 100}%`;
      node.style.top = `${y * 100}%`;
    });
    apply(lastP.current);
  };

  const apply = (p: number) => {
    lastP.current = p;
    const L = layout.current;
    if (!L || !stage.current || !root.current) return;
    const z = interactive ? photoZoom(p) : 0;
    const sx = (L.mirror ? 1 - STEERING.x : STEERING.x) * L.dw;
    const sy = STEERING.y * L.dh;
    const cx = L.wide ? L.cw * 0.66 : L.cw * 0.5;
    const cy = L.wide ? L.ch * 0.5 : L.ch * 0.46;
    const scale = 1 + (L.wide ? 1.7 : 1.35) * z;
    const tx = (cx - (L.ox + sx)) * z;
    const ty = (cy - (L.oy + sy)) * z;
    stage.current.style.transformOrigin = `${sx}px ${sy}px`;
    stage.current.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    root.current.style.opacity = String(interactive ? photoOpacity(p) : 1);
    if (vignette.current) {
      vignette.current.style.opacity = String(z * 0.95);
      vignette.current.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.min(L.cw, L.ch) * 0.12}px, rgb(5 5 6 / 0.92) ${Math.min(L.cw, L.ch) * 0.42}px)`;
    }
    if (reticle.current) {
      const r = smooth(ramp(z, 0.55, 0.95)) * (p < STAGE.approachEnd + 0.04 ? 1 : 0);
      reticle.current.style.opacity = String(r);
      reticle.current.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${0.85 + 0.15 * r})`;
    }
  };

  useImperativeHandle(ref, () => ({ update: apply }));

  useEffect(() => {
    const im = img.current;
    if (im?.complete) measure();
    const ro = new ResizeObserver(() => measure());
    if (root.current) ro.observe(root.current);
    // paralaxe com o mouse (desktop)
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !root.current) return;
      const mx = e.clientX / window.innerWidth - 0.5;
      const my = e.clientY / window.innerHeight - 0.5;
      root.current.style.setProperty("--mx", mx.toFixed(3));
      root.current.style.setProperty("--my", my.toFixed(3));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} aria-hidden className="truck-photo absolute inset-0 overflow-hidden">
      <div className="truck-photo__parallax absolute inset-0">
        <div ref={stage} className="absolute will-change-transform">
          <div className="truck-photo__enter relative size-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={img} src={HERO_PHOTO_SRC} alt="" onLoad={measure} className="absolute inset-0 size-full select-none object-cover" draggable={false} />
            {/* reflexo percorrendo a lataria */}
            <div className="truck-photo__sweep absolute inset-0" />
            {/* faróis */}
            {HEADLIGHTS.map((h, i) => (
              <span key={i} data-poi={`${h.x},${h.y}`} className="truck-photo__headlight absolute">
                <span className="truck-photo__flare" />
              </span>
            ))}
            {/* brilho laranja do ponto da caixa de direção */}
            <span data-poi={`${STEERING.x},${STEERING.y}`} className="truck-photo__poi absolute" />
          </div>
        </div>
      </div>
      {/* foco: escurece tudo, menos a região da caixa */}
      <div ref={vignette} className="pointer-events-none absolute inset-0 opacity-0" />
      {/* mira técnica */}
      <div ref={reticle} className="truck-reticle pointer-events-none absolute left-0 top-0 opacity-0">
        <div className="truck-reticle__ring" />
        <div className="truck-reticle__ring truck-reticle__ring--inner" />
        <span className="truck-reticle__corner tl" />
        <span className="truck-reticle__corner tr" />
        <span className="truck-reticle__corner bl" />
        <span className="truck-reticle__corner br" />
        <div className="truck-reticle__label">
          <span className="truck-reticle__dot" /> Caixa de direção hidráulica
        </div>
      </div>
      {/* sombra no chão e vinhetas de borda */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_120%,rgb(244_119_18/0.18),transparent_55%)]" />
    </div>
  );
}
