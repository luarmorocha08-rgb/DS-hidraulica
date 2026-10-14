import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/SocialIcons";
import { formatPhone } from "@/lib/phone";
import { publicAddress, type SiteSettings } from "@/lib/settings-schema";
import type { Service } from "@/db/schema";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";

export function Footer({
  settings,
  services,
  hoursSummary,
}: {
  settings: SiteSettings;
  services: Pick<Service, "slug" | "name">[];
  hoursSummary: string[];
}) {
  const address = publicAddress(settings);
  const wa = whatsappLink(settings.whatsappNumber, WHATSAPP_MESSAGES.general);
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-white/[0.06] bg-ink-2 pb-24 md:pb-0">
      <div className="hairline" />
      <div className="container-ds grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo className="h-20 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-silver">
            Especialistas em sistemas de direção hidráulica para caminhões, ônibus e veículos pesados. Qualidade,
            confiança e preço justo.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da DS Hidráulica"
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 text-silver transition-colors hover:border-orange hover:text-orange"
            >
              <InstagramIcon className="size-5" />
            </a>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp da DS Hidráulica"
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 text-silver transition-colors hover:border-[#25d366] hover:text-[#25d366]"
              >
                <WhatsAppIcon className="size-5" />
              </a>
            )}
          </div>
        </div>

        <nav aria-label="Links rápidos">
          <h2 className="eyebrow mb-4">Navegação</h2>
          <ul className="space-y-2.5 text-sm text-silver">
            <li><Link className="hover:text-orange" href="/#sobre">Sobre nós</Link></li>
            <li><Link className="hover:text-orange" href="/#servicos">Serviços</Link></li>
            <li><Link className="hover:text-orange" href="/#como-funciona">Como trabalhamos</Link></li>
            <li><Link className="hover:text-orange" href="/agendamento">Agendamento</Link></li>
            <li><Link className="hover:text-orange" href="/visita">Solicitar visita</Link></li>
            <li><Link className="hover:text-orange" href="/orcamento">Orçamento online</Link></li>
            <li><Link className="hover:text-orange" href="/acompanhar">Acompanhar solicitação</Link></li>
          </ul>
        </nav>

        <nav aria-label="Serviços">
          <h2 className="eyebrow mb-4">Serviços</h2>
          <ul className="space-y-2.5 text-sm text-silver">
            {services.slice(0, 7).map((s) => (
              <li key={s.slug}>
                <Link className="hover:text-orange" href={`/servicos/${s.slug}`}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4">Contato</h2>
          <ul className="space-y-3.5 text-sm text-silver">
            {address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                <span>{address}</span>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                <a href={`tel:+${settings.phone.replace(/\D/g, "")}`} className="hover:text-orange">
                  {formatPhone(settings.phone)}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                <a href={`mailto:${settings.email}`} className="hover:text-orange">
                  {settings.email}
                </a>
              </li>
            )}
            {(settings.hoursText || hoursSummary.length > 0) && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                <span>
                  {settings.hoursText
                    ? settings.hoursText
                    : hoursSummary.map((l) => (
                        <span key={l} className="block">
                          {l}
                        </span>
                      ))}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="container-ds flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center">
          <p className="font-display text-lg tracking-wide text-paper">
            DS HIDRÁULICA — <span className="text-orange">PRECISÃO QUE MOVIMENTA.</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-silver-dim">
            <span>© {year} DS Hidráulica{settings.cnpj ? ` · CNPJ ${settings.cnpj}` : ""}</span>
            <Link className="hover:text-orange" href="/privacidade">Política de privacidade</Link>
            <Link className="hover:text-orange" href="/termos">Termos de uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
