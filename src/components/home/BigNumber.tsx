"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número de anos com acabamento metálico. Conta de 0 até o valor ao aparecer e
 * ganha profundidade 3D conforme o scroll.
 */
export function BigNumber({ value }: { value: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let counted = false;
    const io = new IntersectionObserver((entries) => {
      if (counted || !entries[0].isIntersecting) return;
      counted = true;
      const start = performance.now();
      const dur = 1400;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      setDisplay(0);
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const p = Math.max(-1, Math.min(1, (center - window.innerHeight / 2) / window.innerHeight));
        if (inner.current) {
          inner.current.style.transform = `rotateX(${p * 18}deg) rotateY(${-p * 26}deg) translateZ(0)`;
          inner.current.style.setProperty("--depth", String(1 - Math.abs(p)));
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [value]);

  const layers = 14;
  return (
    <div ref={wrap} className="relative flex items-center justify-center [perspective:900px]" aria-hidden>
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_55%,rgb(244_119_18/0.35),transparent_60%)] blur-2xl"
      />
      <div ref={inner} className="relative [transform-style:preserve-3d] transition-transform duration-200 ease-out">
        {Array.from({ length: layers }, (_, i) => (
          <span
            key={i}
            className="absolute inset-0 select-none font-display text-[clamp(11rem,28vw,20rem)] leading-none"
            style={{
              transform: `translateZ(${-i * 2.2}px)`,
              color: i === layers - 1 ? "#1a0d04" : `rgb(${120 - i * 6} ${52 - i * 2} ${16 - i})`,
            }}
          >
            {display}
          </span>
        ))}
        <span className="text-metal relative block select-none font-display text-[clamp(11rem,28vw,20rem)] leading-none drop-shadow-[0_0_30px_rgb(244_119_18/0.35)]">
          {display}
        </span>
      </div>
    </div>
  );
}
