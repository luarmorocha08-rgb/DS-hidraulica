"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Revela o conteúdo ao entrar na tela (leve e sem bloquear a navegação).
 * Sem JavaScript ou com movimento reduzido, o conteúdo aparece normalmente.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  y?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // já visível: não anima
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={clsx(className)}
      style={
        state === "idle"
          ? undefined
          : {
              opacity: state === "shown" ? 1 : 0,
              transform: state === "shown" ? "none" : `translate3d(0, ${y}px, 0)`,
              filter: state === "shown" ? "none" : "blur(6px)",
              transition: `opacity 0.9s var(--ease-out-expo) ${delay}ms, transform 0.9s var(--ease-out-expo) ${delay}ms, filter 0.9s var(--ease-out-expo) ${delay}ms`,
            }
      }
    >
      {children}
    </Tag>
  );
}
