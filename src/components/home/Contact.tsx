import Link from "next/link";
import { CalendarDays, Clock, FileText, Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClass } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatPhone } from "@/lib/phone";
import { publicAddress, type SiteSettings } from "@/lib/settings-schema";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";

export function Contact({ settings, hoursSummary }: { settings: SiteSettings; hoursSummary: string[] }) {
  const wa = whatsappLink(settings.whatsappNumber, WHATSAPP_MESSAGES.general);
  const address = publicAddress(settings);
  const coverage = settings.coverage.description || (settings.coverage.cities.length ? settings.coverage.cities.join(", ") : "");

  return (
    <section id="contato" aria-labelledby="contato-titulo" className="relative py-16 md:py-32 overflow-hidden">
      <span aria-hidden className="watermark top-6 left-[-3vw]">CONTATO</span>
      <div className="container-ds grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeading
            eyebrow="Contato"
            title={<span id="contato-titulo">Fale com quem entende de direção hidráulica.</span>}
            description="Escolha o canal mais prático. Para atendimento com hora marcada, use o agendamento online."
          />
          <Reveal className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link href="/agendamento" className={buttonClass("primary", "lg")}>
              <CalendarDays className="size-5" aria-hidden /> Agendar
            </Link>
            <Link href="/visita" className={buttonClass("secondary", "lg")}>
              <MapPin className="size-5" aria-hidden /> Solicitar visita
            </Link>
            <Link href="/orcamento" className={buttonClass("secondary", "lg")}>
              <FileText className="size-5" aria-hidden /> Orçamento
            </Link>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg", "hover:!border-[#25d366] hover:!bg-[#25d366]/10")}>
                <WhatsAppIcon className="size-5 text-[#25d366]" /> WhatsApp
              </a>
            ) : (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg")}>
                <InstagramIcon className="size-5" /> Instagram
              </a>
            )}
          </Reveal>
        </div>

        <Reveal className="panel p-6 md:p-8">
          <ul className="space-y-6">
            {wa && (
              <li className="flex gap-4">
                <WhatsAppIcon className="mt-1 size-6 shrink-0 text-[#25d366]" />
                <div>
                  <p className="font-heading text-lg font-bold">WhatsApp</p>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-silver hover:text-orange">
                    {formatPhone(settings.whatsappNumber)}
                  </a>
                </div>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-4">
                <Phone className="mt-1 size-6 shrink-0 text-orange" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold">Telefone</p>
                  <a href={`tel:+${settings.phone.replace(/\D/g, "")}`} className="text-silver hover:text-orange">
                    {formatPhone(settings.phone)}
                  </a>
                </div>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-4">
                <Mail className="mt-1 size-6 shrink-0 text-orange" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold">E-mail</p>
                  <a href={`mailto:${settings.email}`} className="break-all text-silver hover:text-orange">
                    {settings.email}
                  </a>
                </div>
              </li>
            )}
            <li className="flex gap-4">
              <InstagramIcon className="mt-1 size-6 shrink-0 text-orange" />
              <div>
                <p className="font-heading text-lg font-bold">Instagram</p>
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-silver hover:text-orange">
                  @ds.hidraulica
                </a>
              </div>
            </li>
            {address && (
              <li className="flex gap-4">
                <MapPin className="mt-1 size-6 shrink-0 text-orange" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold">Endereço</p>
                  <p className="text-silver">{address}</p>
                  {settings.address.mapsUrl && (
                    <a href={settings.address.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-orange hover:underline">
                      Ver no mapa →
                    </a>
                  )}
                </div>
              </li>
            )}
            {(settings.hoursText || hoursSummary.length > 0) && (
              <li className="flex gap-4">
                <Clock className="mt-1 size-6 shrink-0 text-orange" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold">Horário de funcionamento</p>
                  {settings.hoursText ? (
                    <p className="text-silver">{settings.hoursText}</p>
                  ) : (
                    hoursSummary.map((l) => (
                      <p key={l} className="text-silver">
                        {l}
                      </p>
                    ))
                  )}
                </div>
              </li>
            )}
            {coverage && (
              <li className="flex gap-4">
                <MapPin className="mt-1 size-6 shrink-0 text-orange" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold">Área de atendimento no local</p>
                  <p className="text-silver">{coverage}</p>
                </div>
              </li>
            )}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
