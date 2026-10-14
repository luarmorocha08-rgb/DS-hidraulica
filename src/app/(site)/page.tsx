import type { Metadata } from "next";
import { About } from "@/components/home/About";
import { BookingCta } from "@/components/home/BookingCta";
import { Contact } from "@/components/home/Contact";
import { Diagnosis } from "@/components/home/Diagnosis";
import { Gallery } from "@/components/home/Gallery";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Services } from "@/components/home/Services";
import { Testimonials } from "@/components/home/Testimonials";
import { HeroExperience } from "@/components/three/HeroExperience";
import {
  getOpeningHours,
  getPublishedGallery,
  getPublishedServices,
  getPublishedTestimonials,
  getSiteSettings,
  getTimeline,
} from "@/lib/content";
import { summarizeHours } from "@/lib/hours";
import { JsonLd, localBusinessJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const local = s.seo.city ? ` em ${s.seo.city}${s.address.state ? `/${s.address.state}` : ""}` : "";
  return {
    title: { absolute: `DS Hidráulica | Direção Hidráulica para Caminhões e Ônibus${local}` },
    description: s.seo.description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [settings, services, gallery, testimonials, timeline, opening] = await Promise.all([
    getSiteSettings(),
    getPublishedServices(),
    getPublishedGallery(),
    getPublishedTestimonials(),
    getTimeline(),
    getOpeningHours(),
  ]);
  const hours = opening ? summarizeHours(opening.hours) : [];

  return (
    <>
      <JsonLd data={localBusinessJsonLd(settings, services)} />
      <HeroExperience title={settings.hero.title} subtitle={settings.hero.subtitle} />
      <About settings={settings} timeline={timeline} />
      <Services services={services} />
      <HowItWorks />
      <Diagnosis whatsappNumber={settings.whatsappNumber} />
      <BookingCta />
      {gallery.length > 0 && (
        <Gallery
          items={gallery.map((g) => ({
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            mediaType: g.mediaType,
            url: g.url,
            posterUrl: g.posterUrl,
            alt: g.alt,
            isDemo: g.isDemo,
          }))}
        />
      )}
      {/* sem avaliações reais publicadas, a seção não aparece */}
      {testimonials.length > 0 && (
        <Testimonials
          items={testimonials.map((t) => ({
            id: t.id,
            name: t.name,
            rating: t.rating,
            comment: t.comment,
            reviewDate: t.reviewDate,
            serviceName: t.serviceName,
            source: t.source,
            sourceUrl: t.sourceUrl,
          }))}
        />
      )}
      <Contact settings={settings} hoursSummary={hours} />
    </>
  );
}
