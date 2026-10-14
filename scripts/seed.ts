/**
 * Popula o banco com a configuração inicial (idempotente).
 *   npm run db:seed
 * Não cria depoimentos, clientes ou números fictícios.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { bookingTypes, businessHours, scheduleSettings, services, siteSettings } from "../src/db/schema";
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
