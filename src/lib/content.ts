import "server-only";
import { cache } from "react";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingTypes, galleryItems, services, siteSettings, testimonials, timelineEntries } from "@/db/schema";
import { DEFAULT_SITE_SETTINGS, parseSiteSettings, type SiteSettings } from "./settings-schema";
import { getBusinessHours, getScheduleSettings } from "./schedule";

/**
 * Leitura de conteúdo para o site público. Em caso de falha do banco, o site
 * continua no ar com os textos padrão (o erro é registrado no log).
 */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[conteúdo] falha ao carregar ${label}:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export const getSiteSettings = cache(
  (): Promise<SiteSettings> =>
    safe(
      "configurações",
      async () => {
        const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "site")).limit(1);
        return parseSiteSettings(row?.value);
      },
      DEFAULT_SITE_SETTINGS,
    ),
);

export const getPublishedServices = cache(() =>
  safe(
    "serviços",
    () => db.select().from(services).where(eq(services.published, true)).orderBy(asc(services.sortOrder), asc(services.name)),
    [],
  ),
);

export const getServiceBySlug = cache((slug: string) =>
  safe(
    "serviço",
    async () =>
      (await db.select().from(services).where(and(eq(services.slug, slug), eq(services.published, true))).limit(1))[0] ?? null,
    null,
  ),
);

export const getPublishedGallery = cache(() =>
  safe(
    "galeria",
    () =>
      db
        .select()
        .from(galleryItems)
        .where(eq(galleryItems.published, true))
        .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt)),
    [],
  ),
);

export const getPublishedTestimonials = cache(() =>
  safe(
    "depoimentos",
    () => db.select().from(testimonials).where(eq(testimonials.published, true)).orderBy(desc(testimonials.reviewDate)),
    [],
  ),
);

export const getTimeline = cache(() =>
  safe(
    "linha do tempo",
    () =>
      db.select().from(timelineEntries).where(eq(timelineEntries.published, true)).orderBy(asc(timelineEntries.sortOrder)),
    [],
  ),
);

export const getActiveBookingTypes = cache(() =>
  safe(
    "tipos de atendimento",
    () => db.select().from(bookingTypes).where(eq(bookingTypes.active, true)).orderBy(asc(bookingTypes.sortOrder)),
    [],
  ),
);

export const getOpeningHours = cache(() =>
  safe(
    "horários",
    async () => ({ hours: await getBusinessHours(), settings: await getScheduleSettings() }),
    null,
  ),
);
