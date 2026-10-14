import { Footer } from "@/components/site/Footer";
import { FloatingContact } from "@/components/site/FloatingContact";
import { Header } from "@/components/site/Header";
import { getOpeningHours, getPublishedServices, getPublishedTestimonials, getSiteSettings } from "@/lib/content";
import { summarizeHours } from "@/lib/hours";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";

// Conteúdo editável no painel: renderização a cada requisição.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, services, testimonials, opening] = await Promise.all([
    getSiteSettings(),
    getPublishedServices(),
    getPublishedTestimonials(),
    getOpeningHours(),
  ]);
  return (
    <>
      <Header
        showTestimonials={testimonials.length > 0}
        whatsappHref={whatsappLink(settings.whatsappNumber, WHATSAPP_MESSAGES.general)}
        instagramUrl={settings.instagramUrl}
      />
      <main id="conteudo" className="pb-20 md:pb-0">
        {children}
      </main>
      <Footer settings={settings} services={services} hoursSummary={opening ? summarizeHours(opening.hours) : []} />
      <FloatingContact whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} />
    </>
  );
}
