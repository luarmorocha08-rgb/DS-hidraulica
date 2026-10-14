"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/SocialIcons";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";

function contextualMessage(pathname: string) {
  if (pathname.startsWith("/visita")) return WHATSAPP_MESSAGES.visit;
  if (pathname.startsWith("/orcamento")) return WHATSAPP_MESSAGES.quote;
  return WHATSAPP_MESSAGES.general;
}

/** Botão flutuante de contato + barra de ações no celular. */
export function FloatingContact({ whatsappNumber, instagramUrl }: { whatsappNumber: string; instagramUrl: string }) {
  const pathname = usePathname();
  const href = whatsappLink(whatsappNumber, contextualMessage(pathname));
  const hideBar = pathname.startsWith("/agendamento") || pathname.startsWith("/visita");

  return (
    <>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Conversar pelo WhatsApp"
          className={`fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-6px_rgb(37_211_102/0.6)] transition-transform hover:scale-105 md:bottom-6 md:right-6 ${hideBar ? "bottom-5" : "bottom-[84px]"}`}
        >
          <WhatsAppIcon className="size-7" />
        </a>
      ) : (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar pelo Instagram"
          className={`fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6 ${hideBar ? "bottom-5" : "bottom-[84px]"}`}
        >
          <InstagramIcon className="size-7" />
        </a>
      )}

      {!hideBar && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-graphite/90 backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-2 gap-2 p-2.5">
            <Link
              href="/agendamento"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-orange font-heading text-[0.95rem] font-bold uppercase tracking-wide text-ink"
            >
              <CalendarDays className="size-4" aria-hidden /> Agendar
            </Link>
            <Link
              href="/visita"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-white/15 bg-white/5 font-heading text-[0.95rem] font-bold uppercase tracking-wide text-paper"
            >
              <MapPin className="size-4" aria-hidden /> Solicitar visita
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
