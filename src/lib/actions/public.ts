"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import {
  appointments,
  attachments,
  bookingTypes,
  customers,
  quoteRequests,
  requestEvents,
  visitRequests,
  vehicles,
} from "@/db/schema";
import { bookAppointment, BookingError, rescheduleAppointment, uniqueProtocol } from "@/lib/booking";
import { getSiteSettings } from "@/lib/content";
import { checkCoverage } from "@/lib/coverage";
import { findOrCreateVehicle, upsertCustomer } from "@/lib/customers";
import { APPOINTMENT_STATUS, MODALITY_LABEL, QUOTE_STATUS, URGENCY_LABEL, VEHICLE_TYPE_LABEL, VISIT_STATUS } from "@/lib/labels";
import { dispatchNotification } from "@/lib/notifications";
import { normalizeProtocol, protocolKind } from "@/lib/protocol";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getScheduleSettings } from "@/lib/schedule";
import { storage, storeFiles, UploadError, validateFiles, type StoredFile } from "@/lib/storage";
import { formatDateLong, formatTime } from "@/lib/time";
import {
  appointmentSchema,
  flattenErrors,
  formDataToObject,
  quoteSchema,
  trackSchema,
  visitSchema,
  type FieldErrors,
} from "@/lib/validation";

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; errors?: FieldErrors; code?: string };

async function guard(action: string, limit: number, windowSec: number) {
  const ip = await clientIp();
  const rl = await rateLimit(`${action}:${ip}`, limit, windowSec);
  if (!rl.ok) {
    return {
      ok: false as const,
      message: `Muitas solicitações em pouco tempo. Tente novamente em ${Math.ceil(rl.retryAfter / 60)} minuto(s).`,
    };
  }
  return null;
}

async function handleFiles(fd: FormData, folder: string): Promise<StoredFile[] | { error: string }> {
  try {
    const files = fd.getAll("files").filter((f): f is File => typeof f === "object" && f !== null);
    const validated = await validateFiles(files);
    return await storeFiles(validated, folder);
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }
}

async function discard(files: StoredFile[]) {
  await Promise.all(files.map((f) => storage().delete(f.storageKey)));
}

function vehicleText(v: { vehicleType: keyof typeof VEHICLE_TYPE_LABEL; vehicleBrand: string; vehicleModel: string; vehicleYear?: number }) {
  return `${VEHICLE_TYPE_LABEL[v.vehicleType]} ${v.vehicleBrand} ${v.vehicleModel}${v.vehicleYear ? ` (${v.vehicleYear})` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Agendamento                                                         */
/* ------------------------------------------------------------------ */

export interface AppointmentCreated {
  protocol: string;
  name: string;
  serviceName: string;
  dateText: string;
  timeText: string;
  modality: string;
  status: "pending" | "confirmed";
  statusLabel: string;
  statusMessage: string;
}

export async function createAppointmentAction(fd: FormData): Promise<ActionResult<AppointmentCreated>> {
  const limited = await guard("agendamento", 8, 3600);
  if (limited) return limited;

  const parsed = appointmentSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    return { ok: false, message: "Revise os campos destacados.", errors: flattenErrors(parsed.error) };
  }

  const files = await handleFiles(fd, "agendamentos");
  if ("error" in files) return { ok: false, message: files.error, errors: { files: files.error } };

  const settings = await getSiteSettings();
  try {
    const { appointment, bookingType } = await bookAppointment(parsed.data, { files, settings });
    const tz = (await getScheduleSettings()).timezone;
    const input = parsed.data;
    const status = appointment.status as "pending" | "confirmed";
    const result: AppointmentCreated = {
      protocol: appointment.protocol,
      name: input.name,
      serviceName: bookingType.name,
      dateText: formatDateLong(appointment.startsAt, tz),
      timeText: formatTime(appointment.startsAt, tz),
      modality: MODALITY_LABEL[appointment.modality],
      status,
      statusLabel: APPOINTMENT_STATUS[status].label,
      statusMessage: APPOINTMENT_STATUS[status].customer,
    };
    after(() =>
      dispatchNotification({
        type: "request_created",
        kind: "appointment",
        requestId: appointment.id,
        protocol: appointment.protocol,
        customerName: input.name,
        customerPhone: input.phone,
        customerEmail: input.email,
        statusLabel: result.statusLabel,
        details: `${result.serviceName} — ${result.modality}\n${result.dateText}, ${result.timeText}\nVeículo: ${vehicleText(input)}\nProblema: ${input.problemDescription}`,
      }),
    );
    return { ok: true, ...result };
  } catch (err) {
    await discard(files);
    if (err instanceof BookingError) {
      return { ok: false, message: err.message, code: err.code };
    }
    console.error("[agendamento]", err);
    return { ok: false, message: "Não foi possível concluir o agendamento agora. Tente novamente ou fale pelo WhatsApp." };
  }
}

/* ------------------------------------------------------------------ */
/* Visita ao local                                                     */
/* ------------------------------------------------------------------ */

export interface VisitCreated {
  protocol: string;
  coverage: "inside" | "outside" | "unknown";
  coverageMessage: string;
  statusLabel: string;
  visitFeeNote: string;
}

export async function createVisitAction(fd: FormData): Promise<ActionResult<VisitCreated>> {
  const limited = await guard("visita", 6, 3600);
  if (limited) return limited;

  const parsed = visitSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", errors: flattenErrors(parsed.error) };

  const files = await handleFiles(fd, "visitas");
  if ("error" in files) return { ok: false, message: files.error, errors: { files: files.error } };

  const settings = await getSiteSettings();
  const v = parsed.data;
  const coverage = checkCoverage(settings.coverage, { city: v.city, latitude: v.latitude, longitude: v.longitude });

  try {
    const row = await db.transaction(async (tx) => {
      const customerId = await upsertCustomer(tx, { name: v.name, phone: v.phone, email: v.email, consent: true });
      const vehicleId = await findOrCreateVehicle(tx, customerId, { type: v.vehicleType, brand: v.vehicleBrand, model: v.vehicleModel, year: v.vehicleYear });
      const protocol = await uniqueProtocol(tx, "visit", "visit_requests");
      const [visit] = await tx
        .insert(visitRequests)
        .values({
          protocol,
          customerId,
          vehicleId,
          status: "received",
          problemDescription: v.problemDescription,
          street: v.street,
          number: v.number,
          complement: v.complement,
          district: v.district,
          city: v.city,
          state: v.state,
          postalCode: v.postalCode,
          reference: v.reference,
          latitude: v.latitude,
          longitude: v.longitude,
          coverage,
          preferredDate: v.preferredDate ?? null,
          preferredPeriod: v.preferredPeriod,
        })
        .returning();
      await tx.insert(requestEvents).values({ kind: "visit", requestId: visit.id, toStatus: "received", actor: "customer", note: "Solicitação de visita recebida." });
      if (files.length) await tx.insert(attachments).values(files.map((f) => ({ ...f, kind: "visit" as const, visitId: visit.id })));
      return visit;
    });

    const coverageMessage =
      coverage === "inside"
        ? "Seu endereço está dentro da nossa área de atendimento. A equipe vai confirmar data e horário."
        : coverage === "outside"
          ? "Seu endereço está fora da área habitual de atendimento. A solicitação depende de avaliação da equipe."
          : "A equipe vai avaliar o endereço e a disponibilidade antes de confirmar a visita.";

    after(() =>
      dispatchNotification({
        type: "request_created",
        kind: "visit",
        requestId: row.id,
        protocol: row.protocol,
        customerName: v.name,
        customerPhone: v.phone,
        customerEmail: v.email,
        statusLabel: VISIT_STATUS.received.label,
        details: `Endereço: ${v.street}, ${v.number} — ${v.district}, ${v.city}/${v.state}\nVeículo: ${vehicleText(v)}\nProblema: ${v.problemDescription}`,
      }),
    );
    return {
      ok: true,
      protocol: row.protocol,
      coverage,
      coverageMessage,
      statusLabel: VISIT_STATUS.received.label,
      visitFeeNote: settings.visitFeeNote,
    };
  } catch (err) {
    await discard(files);
    console.error("[visita]", err);
    return { ok: false, message: "Não foi possível enviar a solicitação agora. Tente novamente ou fale pelo WhatsApp." };
  }
}

/* ------------------------------------------------------------------ */
/* Orçamento                                                           */
/* ------------------------------------------------------------------ */

export async function createQuoteAction(fd: FormData): Promise<ActionResult<{ protocol: string; statusLabel: string }>> {
  const limited = await guard("orcamento", 6, 3600);
  if (limited) return limited;

  const parsed = quoteSchema.safeParse(formDataToObject(fd));
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", errors: flattenErrors(parsed.error) };

  const files = await handleFiles(fd, "orcamentos");
  if ("error" in files) return { ok: false, message: files.error, errors: { files: files.error } };

  const q = parsed.data;
  try {
    const row = await db.transaction(async (tx) => {
      const customerId = await upsertCustomer(tx, { name: q.name, phone: q.phone, email: q.email, consent: true });
      const vehicleId = await findOrCreateVehicle(tx, customerId, { type: q.vehicleType, brand: q.vehicleBrand, model: q.vehicleModel, year: q.vehicleYear });
      const protocol = await uniqueProtocol(tx, "quote", "quote_requests");
      const [quote] = await tx
        .insert(quoteRequests)
        .values({ protocol, customerId, vehicleId, serviceType: q.serviceType, problemDescription: q.problemDescription, urgency: q.urgency })
        .returning();
      await tx.insert(requestEvents).values({ kind: "quote", requestId: quote.id, toStatus: "new", actor: "customer", note: "Pedido de orçamento recebido." });
      if (files.length) await tx.insert(attachments).values(files.map((f) => ({ ...f, kind: "quote" as const, quoteId: quote.id })));
      return quote;
    });
    after(() =>
      dispatchNotification({
        type: "request_created",
        kind: "quote",
        requestId: row.id,
        protocol: row.protocol,
        customerName: q.name,
        customerPhone: q.phone,
        customerEmail: q.email,
        statusLabel: QUOTE_STATUS.new.label,
        details: `Serviço: ${q.serviceType}\nUrgência: ${URGENCY_LABEL[q.urgency]}\nVeículo: ${vehicleText(q)}\nProblema: ${q.problemDescription}`,
      }),
    );
    return { ok: true, protocol: row.protocol, statusLabel: QUOTE_STATUS.new.label };
  } catch (err) {
    await discard(files);
    console.error("[orçamento]", err);
    return { ok: false, message: "Não foi possível enviar o pedido agora. Tente novamente ou fale pelo WhatsApp." };
  }
}

/* ------------------------------------------------------------------ */
/* Acompanhamento (protocolo + telefone)                               */
/* ------------------------------------------------------------------ */

export interface TrackedRequest {
  kind: "appointment" | "visit" | "quote";
  id: string;
  protocol: string;
  title: string;
  status: string;
  statusLabel: string;
  tone: string;
  details: Array<[string, string]>;
  events: Array<{ at: string; label: string; note: string | null }>;
  canChange: boolean;
  changeBlockedReason?: string;
  bookingTypeId?: string;
}

export interface TrackResult {
  request: TrackedRequest;
  history: Array<{ protocol: string; kind: string; statusLabel: string; createdAt: string }>;
}

async function findByProtocol(protocol: string, phone: string) {
  const kind = protocolKind(protocol);
  if (!kind) return null;
  const table = kind === "appointment" ? appointments : kind === "visit" ? visitRequests : quoteRequests;
  const [row] = await db
    .select({ id: table.id, customerId: table.customerId, phone: customers.phone })
    .from(table)
    .innerJoin(customers, eq(customers.id, table.customerId))
    .where(eq(table.protocol, protocol))
    .limit(1);
  if (!row || row.phone !== phone) return null;
  return { kind, id: row.id, customerId: row.customerId };
}

export async function trackRequestAction(fd: FormData): Promise<ActionResult<TrackResult>> {
  const limited = await guard("acompanhar", 20, 900);
  if (limited) return limited;
  const parsed = trackSchema.safeParse({ protocol: normalizeProtocol(String(fd.get("protocol") ?? "")), phone: fd.get("phone") });
  if (!parsed.success) return { ok: false, message: "Revise os campos.", errors: flattenErrors(parsed.error) };

  const found = await findByProtocol(parsed.data.protocol, parsed.data.phone);
  // mesma mensagem para protocolo inexistente ou telefone diferente
  if (!found) return { ok: false, message: "Não encontramos uma solicitação com este protocolo e telefone." };
  return { ok: true, ...(await loadTracked(found.kind, found.id, found.customerId)) };
}

async function loadTracked(kind: "appointment" | "visit" | "quote", id: string, customerId: string): Promise<TrackResult> {
  const sched = await getScheduleSettings();
  const tz = sched.timezone;
  const events = await db
    .select()
    .from(requestEvents)
    .where(and(eq(requestEvents.kind, kind), eq(requestEvents.requestId, id), eq(requestEvents.visibleToCustomer, true)))
    .orderBy(asc(requestEvents.createdAt));

  let request: TrackedRequest;
  if (kind === "appointment") {
    const [a] = await db
      .select({ a: appointments, typeName: bookingTypes.name, v: vehicles })
      .from(appointments)
      .innerJoin(bookingTypes, eq(bookingTypes.id, appointments.bookingTypeId))
      .leftJoin(vehicles, eq(vehicles.id, appointments.vehicleId))
      .where(eq(appointments.id, id));
    const st = APPOINTMENT_STATUS[a.a.status];
    const leadOk = a.a.startsAt.getTime() - Date.now() > sched.customerChangeLeadHours * 3600000;
    const active = a.a.status === "pending" || a.a.status === "confirmed";
    request = {
      kind,
      id,
      protocol: a.a.protocol,
      title: a.typeName,
      status: a.a.status,
      statusLabel: st.label,
      tone: st.tone,
      details: [
        ["Situação", st.customer],
        ["Modalidade", MODALITY_LABEL[a.a.modality]],
        ["Data", formatDateLong(a.a.startsAt, tz)],
        ["Horário", formatTime(a.a.startsAt, tz)],
        ...(a.v ? [["Veículo", `${a.v.brand} ${a.v.model}`] as [string, string]] : []),
      ],
      events: events.map((e) => ({
        at: e.createdAt.toISOString(),
        label: APPOINTMENT_STATUS[e.toStatus as keyof typeof APPOINTMENT_STATUS]?.label ?? e.toStatus,
        note: e.note,
      })),
      canChange: active && leadOk,
      changeBlockedReason: active && !leadOk ? `Alterações pelo site são possíveis até ${sched.customerChangeLeadHours}h antes do horário. Fale conosco pelo WhatsApp.` : undefined,
      bookingTypeId: a.a.bookingTypeId,
    };
  } else if (kind === "visit") {
    const [v] = await db.select().from(visitRequests).where(eq(visitRequests.id, id));
    const st = VISIT_STATUS[v.status];
    request = {
      kind,
      id,
      protocol: v.protocol,
      title: "Visita técnica ao local",
      status: v.status,
      statusLabel: st.label,
      tone: st.tone,
      details: [
        ["Endereço", `${v.street}, ${v.number} — ${v.district}, ${v.city}/${v.state}`],
        ...(v.scheduledAt ? [["Visita marcada", `${formatDateLong(v.scheduledAt, tz)}, ${formatTime(v.scheduledAt, tz)}`] as [string, string]] : []),
        ...(v.travelFeeNote ? [["Deslocamento", v.travelFeeNote] as [string, string]] : []),
      ],
      events: events.map((e) => ({ at: e.createdAt.toISOString(), label: VISIT_STATUS[e.toStatus as keyof typeof VISIT_STATUS]?.label ?? e.toStatus, note: e.note })),
      canChange: ["received", "in_review", "awaiting_confirmation", "confirmed"].includes(v.status),
    };
  } else {
    const [q] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    const st = QUOTE_STATUS[q.status];
    request = {
      kind,
      id,
      protocol: q.protocol,
      title: `Orçamento — ${q.serviceType}`,
      status: q.status,
      statusLabel: st.label,
      tone: st.tone,
      details: [["Urgência", URGENCY_LABEL[q.urgency]], ...(q.responseNote ? [["Resposta da equipe", q.responseNote] as [string, string]] : [])],
      events: events.map((e) => ({ at: e.createdAt.toISOString(), label: QUOTE_STATUS[e.toStatus as keyof typeof QUOTE_STATUS]?.label ?? e.toStatus, note: e.note })),
      canChange: false,
    };
  }

  // histórico de solicitações do mesmo cliente
  const [aps, vis, qts] = await Promise.all([
    db.select({ protocol: appointments.protocol, status: appointments.status, createdAt: appointments.createdAt }).from(appointments).where(eq(appointments.customerId, customerId)),
    db.select({ protocol: visitRequests.protocol, status: visitRequests.status, createdAt: visitRequests.createdAt }).from(visitRequests).where(eq(visitRequests.customerId, customerId)),
    db.select({ protocol: quoteRequests.protocol, status: quoteRequests.status, createdAt: quoteRequests.createdAt }).from(quoteRequests).where(eq(quoteRequests.customerId, customerId)),
  ]);
  const history = [
    ...aps.map((r) => ({ protocol: r.protocol, kind: "Agendamento", statusLabel: APPOINTMENT_STATUS[r.status].label, createdAt: r.createdAt.toISOString() })),
    ...vis.map((r) => ({ protocol: r.protocol, kind: "Visita", statusLabel: VISIT_STATUS[r.status].label, createdAt: r.createdAt.toISOString() })),
    ...qts.map((r) => ({ protocol: r.protocol, kind: "Orçamento", statusLabel: QUOTE_STATUS[r.status].label, createdAt: r.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { request, history };
}

/** Cancelamento pelo cliente (agendamento ou visita). */
export async function cancelByCustomerAction(fd: FormData): Promise<ActionResult<TrackResult>> {
  const limited = await guard("cancelar", 10, 3600);
  if (limited) return limited;
  const parsed = trackSchema.safeParse({ protocol: normalizeProtocol(String(fd.get("protocol") ?? "")), phone: fd.get("phone") });
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 300) || null;
  const found = await findByProtocol(parsed.data.protocol, parsed.data.phone);
  if (!found || found.kind === "quote") return { ok: false, message: "Solicitação não encontrada." };

  const sched = await getScheduleSettings();
  if (found.kind === "appointment") {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, found.id));
    if (!["pending", "confirmed"].includes(a.status)) return { ok: false, message: "Este agendamento não pode mais ser cancelado." };
    if (a.startsAt.getTime() - Date.now() < sched.customerChangeLeadHours * 3600000)
      return { ok: false, message: `Cancelamentos pelo site são possíveis até ${sched.customerChangeLeadHours}h antes. Fale conosco pelo WhatsApp.` };
    await db.transaction(async (tx) => {
      await tx.update(appointments).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason }).where(and(eq(appointments.id, a.id), inArray(appointments.status, ["pending", "confirmed"])));
      await tx.insert(requestEvents).values({ kind: "appointment", requestId: a.id, fromStatus: a.status, toStatus: "cancelled", actor: "customer", note: reason ? `Cancelado pelo cliente: ${reason}` : "Cancelado pelo cliente." });
    });
  } else {
    const [v] = await db.select().from(visitRequests).where(eq(visitRequests.id, found.id));
    if (["in_progress", "completed", "cancelled"].includes(v.status)) return { ok: false, message: "Esta visita não pode mais ser cancelada pelo site." };
    await db.transaction(async (tx) => {
      await tx.update(visitRequests).set({ status: "cancelled" }).where(eq(visitRequests.id, v.id));
      await tx.insert(requestEvents).values({ kind: "visit", requestId: v.id, fromStatus: v.status, toStatus: "cancelled", actor: "customer", note: reason ? `Cancelada pelo cliente: ${reason}` : "Cancelada pelo cliente." });
    });
  }
  after(() => notifyAdminOfCustomerChange(found.kind, parsed.data.protocol, "cancelou"));
  return { ok: true, ...(await loadTracked(found.kind, found.id, found.customerId)) };
}

/** Reagendamento pelo cliente: o novo horário volta a aguardar confirmação. */
export async function rescheduleByCustomerAction(fd: FormData): Promise<ActionResult<TrackResult>> {
  const limited = await guard("reagendar", 10, 3600);
  if (limited) return limited;
  const parsed = trackSchema.safeParse({ protocol: normalizeProtocol(String(fd.get("protocol") ?? "")), phone: fd.get("phone") });
  const date = String(fd.get("date") ?? "");
  const time = String(fd.get("time") ?? "");
  if (!parsed.success || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, message: "Selecione a nova data e horário." };
  const found = await findByProtocol(parsed.data.protocol, parsed.data.phone);
  if (!found || found.kind !== "appointment") return { ok: false, message: "Agendamento não encontrado." };

  const sched = await getScheduleSettings();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, found.id));
  if (a.startsAt.getTime() - Date.now() < sched.customerChangeLeadHours * 3600000)
    return { ok: false, message: `Reagendamentos pelo site são possíveis até ${sched.customerChangeLeadHours}h antes. Fale conosco pelo WhatsApp.` };
  try {
    await rescheduleAppointment(a.id, date, time, "customer", { resetToPending: true });
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, message: err.message, code: err.code };
    throw err;
  }
  after(() => notifyAdminOfCustomerChange("appointment", parsed.data.protocol, "reagendou"));
  return { ok: true, ...(await loadTracked("appointment", found.id, found.customerId)) };
}

async function notifyAdminOfCustomerChange(kind: "appointment" | "visit" | "quote", protocol: string, verb: string) {
  const { sendEmail } = await import("@/lib/notifications/channels");
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (to) await sendEmail(to, `[Site] Cliente ${verb} — ${protocol}`, `O cliente ${verb} a solicitação ${protocol} pelo site.\n\nVeja no painel: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin`).catch(() => undefined);
  void kind;
}
