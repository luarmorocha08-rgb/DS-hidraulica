import type { Service } from "@/db/schema";
import type { SiteSettings } from "./settings-schema";

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Dados estruturados LocalBusiness — só inclui o que a empresa já confirmou. */
export function localBusinessJsonLd(s: SiteSettings, services: Pick<Service, "name" | "slug">[]) {
  const a = s.address;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: s.companyName,
    description: s.seo.description,
    url: siteUrl(),
    image: `${siteUrl()}/opengraph-image`,
    sameAs: [s.instagramUrl, s.facebookUrl, s.youtubeUrl].filter(Boolean),
    areaServed: s.coverage.cities.length ? s.coverage.cities : undefined,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Serviços de direção hidráulica",
      itemListElement: services.map((sv) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: sv.name, url: `${siteUrl()}/servicos/${sv.slug}` },
      })),
    },
  };
  if (s.phone || s.whatsappNumber) data.telephone = `+${(s.phone || s.whatsappNumber).replace(/\D/g, "")}`;
  if (s.email) data.email = s.email;
  if (a.confirmed && a.street && a.city) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: `${a.street}${a.number ? `, ${a.number}` : ""}`,
      addressLocality: a.city,
      addressRegion: a.state || undefined,
      postalCode: a.postalCode || undefined,
      addressCountry: "BR",
    };
    if (a.latitude != null && a.longitude != null) {
      data.geo = { "@type": "GeoCoordinates", latitude: a.latitude, longitude: a.longitude };
    }
  }
  return data;
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
