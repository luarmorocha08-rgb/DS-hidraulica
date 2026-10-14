import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Check, FileText, MapPin } from "lucide-react";
import { ServiceIcon } from "@/components/brand/ServiceIcon";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { DemoTag } from "@/components/home/About";
import { PageHeader } from "@/components/site/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { getPublishedServices, getServiceBySlug, getSiteSettings } from "@/lib/content";
import { JsonLd, siteUrl } from "@/lib/seo";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [s, settings] = await Promise.all([getServiceBySlug(slug), getSiteSettings()]);
  if (!s) return { title: "Serviço não encontrado" };
  const local = settings.seo.city ? ` em ${settings.seo.city}` : "";
  return {
    title: `${s.name} para caminhões e ônibus${local}`,
    description: `${s.shortDescription} ${s.description}`.slice(0, 158),
    alternates: { canonical: `/servicos/${s.slug}` },
    openGraph: { title: s.name, description: s.shortDescription, images: s.imageUrl ? [s.imageUrl] : undefined },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const [s, settings, all] = await Promise.all([getServiceBySlug(slug), getSiteSettings(), getPublishedServices()]);
  if (!s) notFound();
  const wa = whatsappLink(settings.whatsappNumber, s.whatsappMessage || WHATSAPP_MESSAGES.service(s.name));
  const others = all.filter((o) => o.id !== s.id).slice(0, 4);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.name,
          description: s.description,
          serviceType: "Manutenção de direção hidráulica",
          provider: { "@type": "AutoRepair", name: settings.companyName, url: siteUrl() },
          areaServed: settings.coverage.cities.length ? settings.coverage.cities : undefined,
          url: `${siteUrl()}/servicos/${s.slug}`,
        }}
      />
      <PageHeader eyebrow="Serviço" title={s.name} description={s.shortDescription} />
      <div className="container-ds grid gap-10 py-12 md:py-16 lg:grid-cols-[1.4fr_1fr]">
        <article>
          <div className="panel relative mb-8 aspect-[16/9] overflow-hidden">
            {s.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt={s.imageAlt ?? s.name} className="size-full object-cover" />
                {s.isDemoImage && <DemoTag />}
              </>
            ) : (
              <div className="bg-blueprint flex size-full items-center justify-center">
                <ServiceIcon name={s.icon} className="size-28 text-orange/80" />
              </div>
            )}
          </div>
          <p className="text-lg leading-relaxed text-paper/90">{s.description}</p>
          {s.benefits.length > 0 && (
            <>
              <h2 className="mt-10 font-heading text-2xl font-bold">Benefícios</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.benefits.map((b) => (
                  <li key={b} className="panel flex gap-3 p-4"><Check className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden /> {b}</li>
                ))}
              </ul>
            </>
          )}
          {s.symptoms.length > 0 && (
            <>
              <h2 className="mt-10 font-heading text-2xl font-bold">Sintomas relacionados</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {s.symptoms.map((x) => <li key={x} className="rounded-full border border-white/15 px-3 py-1.5 text-sm">{x}</li>)}
              </ul>
              <p className="mt-4 text-sm text-silver-dim">Sintomas parecidos podem ter causas diferentes — a avaliação técnica identifica a origem.</p>
            </>
          )}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="panel p-6">
            <p className="font-heading text-xl font-bold">Precisa deste serviço?</p>
            <div className="mt-5 grid gap-3">
              <Link href={`/agendamento?servico=${s.slug}`} className={buttonClass("primary", "md")}><CalendarDays className="size-4" /> Agendar serviço</Link>
              <Link href={`/orcamento?servico=${s.slug}`} className={buttonClass("secondary", "md")}><FileText className="size-4" /> Solicitar orçamento</Link>
              <Link href="/visita" className={buttonClass("secondary", "md")}><MapPin className="size-4" /> Solicitar visita ao local</Link>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "md")}><WhatsAppIcon className="size-4" /> Falar pelo WhatsApp</a>}
            </div>
          </div>
          {others.length > 0 && (
            <nav aria-label="Outros serviços" className="panel p-6">
              <p className="eyebrow mb-3">Outros serviços</p>
              <ul className="space-y-2 text-sm">
                {others.map((o) => <li key={o.id}><Link href={`/servicos/${o.slug}`} className="text-silver hover:text-orange">{o.name}</Link></li>)}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </>
  );
}
