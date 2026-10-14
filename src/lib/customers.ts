import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { customers, vehicles } from "@/db/schema";

export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function upsertCustomer(
  tx: Executor,
  data: { name: string; phone: string; email?: string | null; consent: boolean },
) {
  const [row] = await tx
    .insert(customers)
    .values({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      consentAt: data.consent ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: customers.phone,
      set: {
        name: sql`excluded.name`,
        email: sql`coalesce(excluded.email, ${customers.email})`,
        consentAt: sql`coalesce(excluded.consent_at, ${customers.consentAt})`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: customers.id });
  return row.id;
}

export async function findOrCreateVehicle(
  tx: Executor,
  customerId: string,
  data: {
    type: "caminhao" | "onibus" | "utilitario" | "maquina" | "outro";
    brand: string;
    model: string;
    year?: number | null;
  },
) {
  const [existing] = await tx
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.customerId, customerId),
        sql`lower(${vehicles.brand}) = lower(${data.brand})`,
        sql`lower(${vehicles.model}) = lower(${data.model})`,
        sql`${vehicles.year} is not distinct from ${data.year ?? null}`,
      ),
    )
    .limit(1);
  if (existing) return existing.id;
  const [row] = await tx
    .insert(vehicles)
    .values({ customerId, type: data.type, brand: data.brand, model: data.model, year: data.year ?? null })
    .returning({ id: vehicles.id });
  return row.id;
}
