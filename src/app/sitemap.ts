import type { MetadataRoute } from "next";
import { getPublishedServices } from "@/lib/content";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const services = await getPublishedServices();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/agendamento`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/visita`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/orcamento`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...services.map((s) => ({ url: `${base}/servicos/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
