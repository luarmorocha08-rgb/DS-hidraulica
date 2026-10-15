"use client";

import { useEffect } from "react";

/**
 * Efeito ao apertar qualquer elemento com a classe `btn-press`:
 * afunda com mola (CSS), onda de luz a partir do toque, faíscas laranja e
 * uma vibração curta em celulares compatíveis.
 */
export function PressEffects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn-press");
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
      if (e.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate?.(10);
      if (reduced.matches) return;

      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.4;
      const ripple = document.createElement("span");
      ripple.className = "press-ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - r.left}px`;
      ripple.style.top = `${e.clientY - r.top}px`;
      el.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });

      const n = 9;
      for (let i = 0; i < n; i++) {
        const spark = document.createElement("span");
        spark.className = "press-spark";
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const d = 22 + Math.random() * 26;
        spark.style.left = `${e.clientX}px`;
        spark.style.top = `${e.clientY}px`;
        spark.style.setProperty("--dx", `${Math.cos(a) * d}px`);
        spark.style.setProperty("--dy", `${Math.sin(a) * d}px`);
        document.body.appendChild(spark);
        spark.addEventListener("animationend", () => spark.remove(), { once: true });
      }
    };

    const onUp = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".btn-press");
      if (!el || reduced.matches) return;
      el.classList.remove("is-popped");
      void el.offsetWidth; // reinicia a animação
      el.classList.add("is-popped");
      window.setTimeout(() => el.classList.remove("is-popped"), 520);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);
  return null;
}
