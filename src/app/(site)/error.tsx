"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-ds flex min-h-[70svh] flex-col items-start justify-center pt-28">
      <p className="eyebrow">Algo deu errado</p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">Não foi possível carregar esta página.</h1>
      <p className="mt-4 text-silver">Tente novamente em instantes. Se preferir, fale conosco pelo WhatsApp ou Instagram.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "md")}>Tentar novamente</button>
        <Link href="/" className={buttonClass("secondary", "md")}>Ir para o início</Link>
      </div>
    </div>
  );
}
