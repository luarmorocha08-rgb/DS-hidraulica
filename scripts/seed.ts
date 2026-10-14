/**
 * Popula o banco com a configuração inicial (idempotente).
 *   npm run db:seed
 * Não cria depoimentos, clientes ou números fictícios.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { eq } from "drizzle-orm";
import { bookingTypes, businessHours, galleryItems, scheduleSettings, services, siteSettings } from "../src/db/schema";
import { SEED_BOOKING_TYPES, SEED_BUSINESS_HOURS, SEED_SERVICES } from "../src/db/seed-data";
import { DEFAULT_SITE_SETTINGS } from "../src/lib/settings-schema";

async function main() {
  await db.insert(scheduleSettings).values({ id: 1 }).onConflictDoNothing();
  await db.insert(businessHours).values(SEED_BUSINESS_HOURS).onConflictDoNothing();
  await db
    .insert(bookingTypes)
    .values(SEED_BOOKING_TYPES.map((b, i) => ({ ...b, sortOrder: i })))
    .onConflictDoNothing();
  await db
    .insert(services)
    .values(
      SEED_SERVICES.map((s, i) => ({
        ...s,
        benefits: [...s.benefits],
        symptoms: [...s.symptoms],
        sortOrder: i,
        reviewed: false,
        isDemoImage: true,
      })),
    )
    .onConflictDoNothing();
  // Imagens de demonstração (renders da intro 3D), identificadas no site como tal,
  // até a empresa enviar fotos reais pelo painel.
  await db
    .update(services)
    .set({ imageUrl: "/hero/poster.jpg", imageAlt: "Render 3D de caixa de direção hidráulica", isDemoImage: true })
    .where(eq(services.slug, "manutencao-caixa-de-direcao-hidraulica"));
  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from gallery_items`)).rows;
  if (n === 0) {
    await db.insert(galleryItems).values([
      { title: "Caixa de direção — vista explodida", description: "Render técnico mostrando os componentes internos.", category: "caixas", url: "/hero/poster-exploded.jpg", alt: "Render 3D da caixa de direção desmontada", isDemo: true, sortOrder: 0 },
      { title: "Caixa de direção hidráulica", description: "Render técnico do conjunto montado.", category: "caixas", url: "/hero/poster.jpg", alt: "Render 3D da caixa de direção montada", isDemo: true, sortOrder: 1 },
      { title: "Sem-fim e pistão de esferas", description: "Render técnico de componentes internos.", category: "componentes", url: "/hero/sequence/frame-050.jpg", alt: "Render 3D de componentes internos da caixa de direção", isDemo: true, sortOrder: 2 },
    ]);
  }
  await db.insert(siteSettings).values({ key: "site", value: DEFAULT_SITE_SETTINGS }).onConflictDoNothing();

  const counts = await db.execute(sql`
    select (select count(*) from services) as services,
           (select count(*) from booking_types) as booking_types,
           (select count(*) from business_hours) as business_hours`);
  console.log("Seed concluído:", counts.rows[0]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
