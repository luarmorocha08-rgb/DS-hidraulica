"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Dispositivos simples: sequência de imagens pré-renderizadas da mesma cena 3D
 * (gerada por `npm run hero:render`), sincronizada ao scroll.
 * Sem a sequência, mostra o pôster estático.
 */
export function HeroSequence({ progress, dir, active }: { progress: RefObject<number>; dir: string; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const [mode, setMode] = useState<"loading" | "sequence" | "poster">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`${dir}/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: { count: number; pattern: string }) => {
        if (cancelled || !m.count) return setMode("poster");
        const list: HTMLImageElement[] = [];
        for (let i = 0; i < m.count; i++) {
          const img = new Image();
          img.decoding = "async";
          // primeiro quadro com prioridade; os demais em seguida
          img.src = `${dir}/${m.pattern.replace("{i}", String(i).padStart(3, "0"))}`;
          list.push(img);
        }
        frames.current = list;
        list[0].onload = () => !cancelled && setMode("sequence");
      })
      .catch(() => !cancelled && setMode("poster"));
    return () => {
      cancelled = true;
    };
  }, [dir]);

  useEffect(() => {
    if (mode !== "sequence" || !active) return;
    let raf = 0;
    let last = -1;
    const draw = () => {
      const list = frames.current;
      const c = canvas.current;
      if (c && list.length) {
        let i = Math.round((progress.current ?? 0) * (list.length - 1));
        // usa o quadro carregado mais próximo
        while (i > 0 && !list[i].complete) i--;
        if (i !== last && list[i].complete) {
          const img = list[i];
          const ctx = c.getContext("2d");
          if (ctx) {
            const w = (c.width = c.clientWidth * Math.min(2, devicePixelRatio));
            const h = (c.height = c.clientHeight * Math.min(2, devicePixelRatio));
            const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
          }
          last = i;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, active, progress]);

  if (mode === "poster") return <HeroPoster />;
  return <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />;
}

export function HeroPoster({ className = "", src = "/hero/poster.jpg" }: { className?: string; src?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      onError={() => setOk(false)}
      className={`absolute inset-0 size-full object-cover ${className}`}
    />
  );
}
