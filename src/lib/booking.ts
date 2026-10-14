import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, attachments, requestEvents, type Appointment, type BookingType } from "@/db/schema";
import { computeDayAvailability } from "./availability";
import { checkCoverage } from "./coverage";
import { findOrCreateVehicle, upsertCustomer, type Executor } from "./customers";
import { generateProtocol } from "./protocol";
import { dayContext, getBookingType, loadScheduleContext } from "./schedule";
import type { SiteSettings } from "./settings-schema";
import type { StoredFile } from "./storage";
import { zonedParts, zonedToUtc } from "./time";
import type { AppointmentInput } from "./validation";

export class BookingError extends Error {
  constructor(
    public code: "slot_taken" | "invalid_type" | "modality_not_allowed" | "not_found" | "not_allowed" | "too_late",
    message: string,
  ) {
    super(message);
  }
}

/** Serializa reservas do mesmo dia entre transações concorrentes. */
export async function lockDay(tx: Executor, date: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ds-booking:${date}`}))`);
}

async function assertSlotFree(
  tx: Executor,
  date: string,
  time: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
) {
  const loaded = await loadScheduleContext(date, date, { excludeAppointmentId }, tx);
  const day = computeDayAvailability(dayContext(loaded, date, durationMinutes));
  const slot = day.slots.find((s) => s.time === time);
  if (!slot || !slot.available) {
    throw new BookingError(
      "slot_taken",
      "Este horário acabou de ficar indisponível. Escolha outro horário — a lista foi atualizada.",
    );
  }
  return { rules: loaded.rules, startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) };
}

async function uniqueProtocol(tx: Executor, kind: "appointment" | "visit" | "quote", table: "appointments" | "visit_requests" | "quote_requests") {
  for (let i = 0; i < 5; i++) {
    const protocol = generateProtocol(kind);
    const r = await tx.execute(sql`select 1 from ${sql.identifier(table)} where protocol = ${protocol} limit 1`);
    if (r.rows.length === 0) return protocol;
  }
  throw new Error("Não foi possível gerar protocolo único.");
}

export { uniqueProtocol };

export interface BookingResult {
  appointment: Appointment;
  bookingType: BookingType;
}

export async function bookAppointment(
  input: AppointmentInput,
  opts: { files?: StoredFile[]; settings: SiteSettings; source?: "site" | "admin"; actor?: string; forceStatus?: "pending" | "confirmed" },
): Promise<BookingResult> {
  const bookingType = await getBookingType(input.bookingTypeId);
  if (!bookingType) throw new BookingError("invalid_type", "Tipo de atendimento indisponível.");
  if (input.modality === "workshop" && !bookingType.allowWorkshop)
    throw new BookingError("modality_not_allowed", "Este atendimento não é feito na oficina.");
  if (input.modality === "onsite" && !bookingType.allowOnsite)
    throw new BookingError("modality_not_allowed", "Este atendimento não é feito no local.");

  const appointment = await db.transaction(async (tx) => {
    await lockDay(tx, input.date);
    const { rules, startsAt, endsAt } = await assertSlotFree(tx, input.date, input.time, bookingType.durationMinutes);

    const customerId = await upsertCustomer(tx, {
      name: input.name,
      phone: input.phone,
      email: input.email,
      consent: true,
    });
    const vehicleId = await findOrCreateVehicle(tx, customerId, {
      type: input.vehicleType,
      brand: input.vehicleBrand,
      model: input.vehicleModel,
      year: input.vehicleYear,
    });

    const onsite = input.modality === "onsite";
    const status =
      opts.forceStatus ?? (!onsite && rules.autoConfirmWorkshop ? "confirmed" : "pending");
    const coverage = onsite
      ? checkCoverage(opts.settings.coverage, {
          city: input.city,
          latitude: input.latitude,
          longitude: input.longitude,
        })
      : null;

    const protocol = await uniqueProtocol(tx, "appointment", "appointments");
    const [row] = await tx
      .insert(appointments)
      .values({
        protocol,
        customerId,
        vehicleId,
        bookingTypeId: bookingType.id,
        serviceId: input.serviceId ?? null,
        modality: input.modality,
        startsAt,
        endsAt,
        status,
        problemDescription: input.problemDescription,
        customerNotes: input.customerNotes ?? null,
        street: onsite ? input.street : null,
        number: onsite ? input.number : null,
        complement: onsite ? input.complement : null,
        district: onsite ? input.district : null,
        city: onsite ? input.city : null,
        state: onsite ? input.state?.toUpperCase() : null,
        postalCode: onsite ? input.postalCode : null,
        reference: onsite ? input.reference : null,
        latitude: onsite ? input.latitude : null,
        longitude: onsite ? input.longitude : null,
        coverage,
        source: opts.source ?? "site",
        confirmedAt: status === "confirmed" ? new Date() : null,
      })
      .returning();

    await tx.insert(requestEvents).values({
      kind: "appointment",
      requestId: row.id,
      fromStatus: null,
      toStatus: status,
      actor: opts.actor ?? "customer",
      note: status === "confirmed" ? "Agendamento confirmado." : "Solicitação recebida — aguardando confirmação.",
    });

    if (opts.files?.length) {
      await tx.insert(attachments).values(
        opts.files.map((f) => ({ ...f, kind: "appointment" as const, appointmentId: row.id })),
      );
    }
    return row;
  });

  return { appointment, bookingType };
}

/** Reagendamento (cliente ou administrador). Mantém o mesmo protocolo. */
export async function rescheduleAppointment(
  appointmentId: string,
  date: string,
  time: string,
  actor: string,
  opts: { resetToPending?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .for("update")
      .limit(1);
    if (!current) throw new BookingError("not_found", "Agendamento não encontrado.");
    if (current.status !== "pending" && current.status !== "confirmed")
      throw new BookingError("not_allowed", "Este agendamento não pode mais ser alterado.");

    const bookingType = await getBookingType(current.bookingTypeId, tx);
    const duration = bookingType?.durationMinutes ?? Math.round((current.endsAt.getTime() - current.startsAt.getTime()) / 60000);

    await lockDay(tx, date);
    const { rules, startsAt, endsAt } = await assertSlotFree(tx, date, time, duration, current.id);

    const newStatus = opts.resetToPending && !rules.autoConfirmWorkshop ? "pending" : current.status;
    const [updated] = await tx
      .update(appointments)
      .set({
        startsAt,
        endsAt,
        status: current.modality === "onsite" && opts.resetToPending ? "pending" : newStatus,
        reminderSentAt: null,
      })
      .where(eq(appointments.id, current.id))
      .returning();

    const tz = rules.timezone;
    const from = zonedParts(current.startsAt, tz);
    await tx.insert(requestEvents).values({
      kind: "appointment",
      requestId: current.id,
      fromStatus: current.status,
      toStatus: updated.status,
      actor,
      note: `Reagendado de ${from.date.split("-").reverse().join("/")} ${from.time} para ${date
        .split("-")
        .reverse()
        .join("/")} ${time}.`,
    });
    return updated;
  });
}

export function startsAtFor(date: string, time: string, tz: string) {
  return zonedToUtc(date, time, tz);
}
