import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { appointments, bookingTypes, customers, vehicles } from "@/db/schema";

export async function appointmentsBetween(from: Date, to: Date) {
  return db
    .select({
      id: appointments.id,
      protocol: appointments.protocol,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      modality: appointments.modality,
      city: appointments.city,
      typeName: bookingTypes.name,
      customerName: customers.name,
      customerPhone: customers.phone,
      vehicle: vehicles.model,
      vehicleBrand: vehicles.brand,
    })
    .from(appointments)
    .innerJoin(bookingTypes, eq(bookingTypes.id, appointments.bookingTypeId))
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .leftJoin(vehicles, eq(vehicles.id, appointments.vehicleId))
    .where(and(gte(appointments.startsAt, from), lt(appointments.startsAt, to)))
    .orderBy(asc(appointments.startsAt));
}
