"use server";

import { eq, inArray, or } from "drizzle-orm";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  admins,
  appointments,
  attachments,
  bookingTypes,
  businessHours,
  customers,
  galleryItems,
  holidays,
  quoteRequests,
  requestEvents,
  scheduleBlocks,
  scheduleSettings,
  services,
  siteSettings,
  testimonials,
  timelineEntries,
  visitRequests,
  type AppointmentStatus,
  type QuoteStatus,
  type VisitStatus,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { bookAppointment, BookingError, rescheduleAppointment } from "@/lib/booking";
import { getSiteSettings } from "@/lib/content";
import { APPOINTMENT_STATUS, QUOTE_STATUS, VISIT_STATUS } from "@/lib/labels";
import { dispatchNotification } from "@/lib/notifications";
import { getScheduleSettings } from "@/lib/schedule";
import { siteSettingsSchema } from "@/lib/settings-schema";
import { storage, storeFiles, UploadError, validateFiles } from "@/lib/storage";
import { zonedToUtc } from "@/lib/time";
import { appointmentSchema, flattenErrors, formDataToObject } from "@/lib/validation";

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

function back(path: string, msg: string, kind: "msg" | "error" = "msg"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const lines = (fd: FormData, k: string) =>
  str(fd, k)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const uuid = z.uuid();

async function customerContact(customerId: string) {
  const [c] = await db.select().from(customers).where(eq(customers.id, customerId));
  return c;
}

/** Imagens do site (públicas): gravadas com prefixo public/ e servidas por /api/media. */
async function uploadPublicImage(fd: FormData, field: string): Promise<string | null> {
  const file = fd.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const validated = await validateFiles([file]);
  const [stored] = await storeFiles(validated, "public/site");
  return `/api/media/${stored.storageKey}`;
}

/* ------------------------------------------------------------------ */
/* Agendamentos                                                        */
/* ------------------------------------------------------------------ */

export async function updateAppointmentStatusAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  const status = z.enum(Object.keys(APPOINTMENT_STATUS) as [AppointmentStatus, ...AppointmentStatus[]]).parse(str(fd, "status"));
  const note = opt(fd, "note");
  const notify = bool(fd, "notify");
  const path = `/admin/agendamentos/${id}`;

  const [current] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!current) back("/admin/agendamentos", "Agendamento não encontrado.", "error");
  if (current.status === status && !note) back(path, "Nenhuma alteração.");

  await db.transaction(async (tx) => {
    await tx
      .update(appointments)
      .set({
        status,
        confirmedAt: status === "confirmed" ? new Date() : current.confirmedAt,
        cancelledAt: status === "cancelled" ? new Date() : current.cancelledAt,
        cancelReason: status === "cancelled" ? note : current.cancelReason,
      })
      .where(eq(appointments.id, id));
    await tx.insert(requestEvents).values({ kind: "appointment", requestId: id, fromStatus: current.status, toStatus: status, actor: `admin:${admin.id}`, note });
  });
  await audit(admin.id, "appointment_status", "appointment", id, { from: current.status, to: status });

  if (notify) {
    const c = await customerContact(current.customerId);
    after(() =>
      dispatchNotification({ type: "status_changed", kind: "appointment", requestId: id, protocol: current.protocol, customerName: c.name, customerPhone: c.phone, customerEmail: c.email, statusLabel: APPOINTMENT_STATUS[status].label, note }),
    );
  }
  back(path, `Situação alterada para "${APPOINTMENT_STATUS[status].label}".`);
}

export async function rescheduleAppointmentAdminAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  const date = str(fd, "date");
  const time = str(fd, "time");
  const path = `/admin/agendamentos/${id}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) back(path, "Informe data e horário.", "error");
  try {
    const updated = await rescheduleAppointment(id, date, time, `admin:${admin.id}`);
    await audit(admin.id, "appointment_reschedule", "appointment", id, { date, time });
    if (bool(fd, "notify")) {
      const c = await customerContact(updated.customerId);
      after(() =>
        dispatchNotification({ type: "status_changed", kind: "appointment", requestId: id, protocol: updated.protocol, customerName: c.name, customerPhone: c.phone, customerEmail: c.email, statusLabel: `${APPOINTMENT_STATUS[updated.status].label} — novo horário ${date.split("-").reverse().join("/")} ${time}` }),
      );
    }
  } catch (err) {
    if (err instanceof BookingError) back(path, err.message, "error");
    throw err;
  }
  back(path, "Agendamento reagendado.");
}

export async function saveAppointmentNotesAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  await db.update(appointments).set({ internalNotes: opt(fd, "internalNotes") }).where(eq(appointments.id, id));
  await audit(admin.id, "appointment_notes", "appointment", id);
  back(`/admin/agendamentos/${id}`, "Observações salvas.");
}

export async function createManualAppointmentAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const obj = { ...formDataToObject(fd), consent: "on" };
  const parsed = appointmentSchema.safeParse(obj);
  if (!parsed.success) {
    const first = Object.values(flattenErrors(parsed.error))[0];
    back("/admin/agenda/novo", first ?? "Dados inválidos.", "error");
  }
  let id: string;
  try {
    const { appointment } = await bookAppointment(parsed.data, {
      settings: await getSiteSettings(),
      source: "admin",
      actor: `admin:${admin.id}`,
      forceStatus: bool(fd, "pending") ? "pending" : "confirmed",
    });
    id = appointment.id;
  } catch (err) {
    if (err instanceof BookingError) back("/admin/agenda/novo", err.message, "error");
    throw err;
  }
  await audit(admin.id, "appointment_create", "appointment", id);
  back(`/admin/agendamentos/${id}`, "Agendamento criado.");
}

/* ------------------------------------------------------------------ */
/* Visitas e orçamentos                                                */
/* ------------------------------------------------------------------ */

export async function updateVisitAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  const status = z.enum(Object.keys(VISIT_STATUS) as [VisitStatus, ...VisitStatus[]]).parse(str(fd, "status"));
  const path = `/admin/visitas/${id}`;
  const [current] = await db.select().from(visitRequests).where(eq(visitRequests.id, id));
  if (!current) back("/admin/visitas", "Visita não encontrada.", "error");

  const tz = (await getScheduleSettings()).timezone;
  const date = str(fd, "scheduledDate");
  const time = str(fd, "scheduledTime");
  const scheduledAt = date && time ? zonedToUtc(date, time, tz) : null;
  const note = opt(fd, "note");

  await db.transaction(async (tx) => {
    await tx
      .update(visitRequests)
      .set({ status, scheduledAt, travelFeeNote: opt(fd, "travelFeeNote"), internalNotes: opt(fd, "internalNotes") })
      .where(eq(visitRequests.id, id));
    if (status !== current.status || note) {
      await tx.insert(requestEvents).values({ kind: "visit", requestId: id, fromStatus: current.status, toStatus: status, actor: `admin:${admin.id}`, note });
    }
  });
  await audit(admin.id, "visit_update", "visit", id, { from: current.status, to: status });
  if (bool(fd, "notify")) {
    const c = await customerContact(current.customerId);
    after(() =>
      dispatchNotification({ type: "status_changed", kind: "visit", requestId: id, protocol: current.protocol, customerName: c.name, customerPhone: c.phone, customerEmail: c.email, statusLabel: VISIT_STATUS[status].label, note }),
    );
  }
  back(path, "Visita atualizada.");
}

export async function updateQuoteAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  const status = z.enum(Object.keys(QUOTE_STATUS) as [QuoteStatus, ...QuoteStatus[]]).parse(str(fd, "status"));
  const [current] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
  if (!current) back("/admin/orcamentos", "Orçamento não encontrado.", "error");
  const responseNote = opt(fd, "responseNote");
  await db.transaction(async (tx) => {
    await tx.update(quoteRequests).set({ status, responseNote, internalNotes: opt(fd, "internalNotes") }).where(eq(quoteRequests.id, id));
    if (status !== current.status) {
      await tx.insert(requestEvents).values({ kind: "quote", requestId: id, fromStatus: current.status, toStatus: status, actor: `admin:${admin.id}`, note: opt(fd, "note") });
    }
  });
  await audit(admin.id, "quote_update", "quote", id, { from: current.status, to: status });
  if (bool(fd, "notify")) {
    const c = await customerContact(current.customerId);
    after(() =>
      dispatchNotification({ type: "status_changed", kind: "quote", requestId: id, protocol: current.protocol, customerName: c.name, customerPhone: c.phone, customerEmail: c.email, statusLabel: QUOTE_STATUS[status].label, note: responseNote }),
    );
  }
  back(`/admin/orcamentos/${id}`, "Orçamento atualizado.");
}

/* ------------------------------------------------------------------ */
/* Clientes (LGPD)                                                     */
/* ------------------------------------------------------------------ */

export async function saveCustomerNotesAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  await db.update(customers).set({ internalNotes: opt(fd, "internalNotes") }).where(eq(customers.id, id));
  await audit(admin.id, "customer_notes", "customer", id);
  back(`/admin/clientes/${id}`, "Observações salvas.");
}

/** Atende pedidos de exclusão (LGPD): remove dados pessoais e anexos, mantém estatísticas. */
export async function anonymizeCustomerAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = uuid.parse(str(fd, "id"));
  const [aps, vis, qts] = await Promise.all([
    db.select({ id: appointments.id }).from(appointments).where(eq(appointments.customerId, id)),
    db.select({ id: visitRequests.id }).from(visitRequests).where(eq(visitRequests.customerId, id)),
    db.select({ id: quoteRequests.id }).from(quoteRequests).where(eq(quoteRequests.customerId, id)),
  ]);
  const conds = [
    aps.length ? inArray(attachments.appointmentId, aps.map((r) => r.id)) : null,
    vis.length ? inArray(attachments.visitId, vis.map((r) => r.id)) : null,
    qts.length ? inArray(attachments.quoteId, qts.map((r) => r.id)) : null,
  ].filter((c) => c !== null);
  const all = conds.length ? await db.select().from(attachments).where(or(...conds)) : [];
  await Promise.all(all.map((f) => storage().delete(f.storageKey)));
  await db.transaction(async (tx) => {
    if (all.length) await tx.delete(attachments).where(inArray(attachments.id, all.map((f) => f.id)));
    await tx.update(customers).set({ name: "Cliente removido (LGPD)", phone: `removido-${id}`, email: null, internalNotes: null }).where(eq(customers.id, id));
    const anon = { street: null, number: null, complement: null, reference: null, latitude: null, longitude: null, postalCode: null };
    await tx.update(appointments).set({ ...anon, customerNotes: null }).where(eq(appointments.customerId, id));
    await tx.update(visitRequests).set(anon).where(eq(visitRequests.customerId, id));
  });
  await audit(admin.id, "customer_anonymize", "customer", id, { attachments: all.length });
  back(`/admin/clientes/${id}`, "Dados pessoais removidos.");
}

/* ------------------------------------------------------------------ */
/* Configuração da agenda                                              */
/* ------------------------------------------------------------------ */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export async function saveBusinessHoursAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  for (let d = 0; d <= 6; d++) {
    const isOpen = bool(fd, `open_${d}`);
    const openTime = hhmm.safeParse(str(fd, `start_${d}`)).data ?? "08:00";
    const closeTime = hhmm.safeParse(str(fd, `end_${d}`)).data ?? "18:00";
    const bs = hhmm.safeParse(str(fd, `bstart_${d}`)).data ?? null;
    const be = hhmm.safeParse(str(fd, `bend_${d}`)).data ?? null;
    if (isOpen && closeTime <= openTime) back("/admin/configuracoes", "O fechamento precisa ser depois da abertura.", "error");
    await db
      .insert(businessHours)
      .values({ weekday: d, isOpen, openTime, closeTime, breakStart: bs && be ? bs : null, breakEnd: bs && be ? be : null })
      .onConflictDoUpdate({ target: businessHours.weekday, set: { isOpen, openTime, closeTime, breakStart: bs && be ? bs : null, breakEnd: bs && be ? be : null } });
  }
  await audit(admin.id, "business_hours", "schedule", null);
  back("/admin/configuracoes", "Horário de funcionamento salvo.");
}

export async function saveScheduleSettingsAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const n = (k: string, min: number, max: number) => z.coerce.number().int().min(min).max(max).parse(str(fd, k));
  try {
    const values = {
      slotIntervalMinutes: n("slotIntervalMinutes", 5, 240),
      bufferMinutes: n("bufferMinutes", 0, 240),
      capacity: n("capacity", 1, 50),
      minLeadHours: n("minLeadHours", 0, 720),
      maxDaysAhead: n("maxDaysAhead", 1, 365),
      customerChangeLeadHours: n("customerChangeLeadHours", 0, 720),
      autoConfirmWorkshop: bool(fd, "autoConfirmWorkshop"),
    };
    await db.insert(scheduleSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: scheduleSettings.id, set: values });
    await audit(admin.id, "schedule_settings", "schedule", null, values);
  } catch {
    back("/admin/configuracoes", "Valores inválidos nas regras da agenda.", "error");
  }
  back("/admin/configuracoes", "Regras da agenda salvas.");
}

export async function saveBookingTypeAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = opt(fd, "id");
  const values = {
    name: z.string().min(2).max(80).parse(str(fd, "name")),
    description: opt(fd, "description"),
    durationMinutes: z.coerce.number().int().min(10).max(600).parse(str(fd, "durationMinutes")),
    allowWorkshop: bool(fd, "allowWorkshop"),
    allowOnsite: bool(fd, "allowOnsite"),
    active: bool(fd, "active"),
    sortOrder: z.coerce.number().int().catch(0).parse(str(fd, "sortOrder")),
  };
  if (!values.allowWorkshop && !values.allowOnsite) back("/admin/configuracoes", "Escolha ao menos uma modalidade.", "error");
  if (id) await db.update(bookingTypes).set(values).where(eq(bookingTypes.id, uuid.parse(id)));
  else await db.insert(bookingTypes).values({ ...values, slug: slugify(values.name) });
  await audit(admin.id, id ? "booking_type_update" : "booking_type_create", "booking_type", id, values);
  back("/admin/configuracoes", "Tipo de atendimento salvo.");
}

export async function addHolidayAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(str(fd, "date"));
  const name = str(fd, "name") || "Feriado";
  if (!date.success) back("/admin/agenda/bloqueios", "Informe a data.", "error");
  await db.insert(holidays).values({ date: date.data, name }).onConflictDoUpdate({ target: holidays.date, set: { name } });
  await audit(admin.id, "holiday_add", "holiday", date.data, { name });
  back("/admin/agenda/bloqueios", "Feriado salvo.");
}

export async function deleteHolidayAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  await db.delete(holidays).where(eq(holidays.id, id));
  await audit(admin.id, "holiday_delete", "holiday", id);
  back("/admin/agenda/bloqueios", "Feriado removido.");
}

export async function addBlockAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const tz = (await getScheduleSettings()).timezone;
  const startDate = str(fd, "startDate");
  const endDate = str(fd, "endDate") || startDate;
  const startTime = str(fd, "startTime") || "00:00";
  const endTime = str(fd, "endTime") || "23:59";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) back("/admin/agenda/bloqueios", "Informe as datas.", "error");
  const startsAt = zonedToUtc(startDate, startTime, tz);
  const endsAt = zonedToUtc(endDate, endTime, tz);
  if (endsAt <= startsAt) back("/admin/agenda/bloqueios", "O fim precisa ser depois do início.", "error");
  const reason = str(fd, "reason") || "Bloqueio";
  const [row] = await db.insert(scheduleBlocks).values({ startsAt, endsAt, reason, createdBy: admin.id }).returning();
  await audit(admin.id, "block_add", "schedule_block", row.id, { reason, startDate, endDate });
  back("/admin/agenda/bloqueios", "Bloqueio criado. Agendamentos já existentes no período não foram alterados.");
}

export async function deleteBlockAction(fd: FormData) {
  const admin = await requireAdmin("staff");
  const id = uuid.parse(str(fd, "id"));
  await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
  await audit(admin.id, "block_delete", "schedule_block", id);
  back("/admin/agenda/bloqueios", "Bloqueio removido.");
}

/* ------------------------------------------------------------------ */
/* Conteúdo do site                                                    */
/* ------------------------------------------------------------------ */

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function saveServiceAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = opt(fd, "id");
  const path = id ? `/admin/conteudo/servicos/${id}` : "/admin/conteudo/servicos/novo";
  let uploaded: string | null = null;
  try {
    uploaded = await uploadPublicImage(fd, "image");
  } catch (err) {
    if (err instanceof UploadError) back(path, err.message, "error");
    throw err;
  }
  const name = str(fd, "name");
  if (name.length < 3) back(path, "Informe o nome do serviço.", "error");
  const values = {
    name,
    slug: slugify(str(fd, "slug") || name),
    shortDescription: str(fd, "shortDescription").slice(0, 200),
    description: str(fd, "description").slice(0, 3000),
    benefits: lines(fd, "benefits").slice(0, 10),
    symptoms: lines(fd, "symptoms").slice(0, 10),
    icon: str(fd, "icon") || "wrench",
    imageUrl: uploaded ?? (bool(fd, "removeImage") ? null : opt(fd, "imageUrl")),
    imageAlt: opt(fd, "imageAlt"),
    isDemoImage: uploaded ? false : bool(fd, "isDemoImage"),
    whatsappMessage: opt(fd, "whatsappMessage"),
    reviewed: bool(fd, "reviewed"),
    published: bool(fd, "published"),
    sortOrder: z.coerce.number().int().catch(0).parse(str(fd, "sortOrder")),
  };
  let savedId = id;
  try {
    if (id) await db.update(services).set(values).where(eq(services.id, uuid.parse(id)));
    else savedId = (await db.insert(services).values(values).returning({ id: services.id }))[0].id;
  } catch {
    back(path, "Já existe um serviço com este endereço (slug).", "error");
  }
  await audit(admin.id, id ? "service_update" : "service_create", "service", savedId, { name: values.name });
  back(`/admin/conteudo/servicos/${savedId}`, "Serviço salvo.");
}

export async function deleteServiceAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = uuid.parse(str(fd, "id"));
  await db.delete(services).where(eq(services.id, id));
  await audit(admin.id, "service_delete", "service", id);
  back("/admin/conteudo/servicos", "Serviço excluído.");
}

export async function saveGalleryItemAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = opt(fd, "id");
  const base = "/admin/conteudo/galeria";
  let url = opt(fd, "url");
  let mediaType: "image" | "video" = str(fd, "mediaType") === "video" ? "video" : "image";
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const validated = await validateFiles([file]);
      const [stored] = await storeFiles(validated, "public/galeria");
      url = `/api/media/${stored.storageKey}`;
      mediaType = stored.mimeType.startsWith("video/") ? "video" : "image";
    } catch (err) {
      if (err instanceof UploadError) back(base, err.message, "error");
      throw err;
    }
  }
  if (!url) back(base, "Envie um arquivo ou informe a URL.", "error");
  const category = z.enum(["caixas", "bombas", "caminhoes", "componentes", "oficina", "antes_depois"]).catch("oficina").parse(str(fd, "category"));
  const values = {
    title: str(fd, "title") || "Sem título",
    description: opt(fd, "description"),
    category,
    mediaType,
    url,
    posterUrl: opt(fd, "posterUrl"),
    alt: str(fd, "alt") || str(fd, "title") || "Foto de serviço da DS Hidráulica",
    isDemo: bool(fd, "isDemo"),
    published: bool(fd, "published"),
    sortOrder: z.coerce.number().int().catch(0).parse(str(fd, "sortOrder")),
  };
  if (id) await db.update(galleryItems).set(values).where(eq(galleryItems.id, uuid.parse(id)));
  else await db.insert(galleryItems).values(values);
  await audit(admin.id, id ? "gallery_update" : "gallery_create", "gallery", id, { title: values.title });
  back(base, "Item da galeria salvo.");
}

export async function deleteGalleryItemAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = uuid.parse(str(fd, "id"));
  const [item] = await db.delete(galleryItems).where(eq(galleryItems.id, id)).returning();
  if (item?.url.startsWith("/api/media/")) await storage().delete(item.url.replace("/api/media/", ""));
  await audit(admin.id, "gallery_delete", "gallery", id);
  back("/admin/conteudo/galeria", "Item removido.");
}

export async function saveTestimonialAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = opt(fd, "id");
  const base = "/admin/conteudo/depoimentos";
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().trim().min(5).max(1500),
      reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse({ name: str(fd, "name"), rating: str(fd, "rating"), comment: str(fd, "comment"), reviewDate: str(fd, "reviewDate") });
  if (!parsed.success) back(base, "Preencha nome, nota, comentário e data.", "error");
  const values = { ...parsed.data, serviceName: opt(fd, "serviceName"), source: opt(fd, "source"), sourceUrl: opt(fd, "sourceUrl"), published: bool(fd, "published") };
  if (id) await db.update(testimonials).set(values).where(eq(testimonials.id, uuid.parse(id)));
  else await db.insert(testimonials).values(values);
  await audit(admin.id, id ? "testimonial_update" : "testimonial_create", "testimonial", id, { name: values.name });
  back(base, "Depoimento salvo.");
}

export async function deleteTestimonialAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = uuid.parse(str(fd, "id"));
  await db.delete(testimonials).where(eq(testimonials.id, id));
  await audit(admin.id, "testimonial_delete", "testimonial", id);
  back("/admin/conteudo/depoimentos", "Depoimento removido.");
}

export async function saveTimelineAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = opt(fd, "id");
  const base = "/admin/conteudo/trajetoria";
  const values = {
    period: str(fd, "period"),
    title: str(fd, "title"),
    description: str(fd, "description"),
    published: bool(fd, "published"),
    sortOrder: z.coerce.number().int().catch(0).parse(str(fd, "sortOrder")),
  };
  if (!values.period || !values.title) back(base, "Informe período e título.", "error");
  if (id) await db.update(timelineEntries).set(values).where(eq(timelineEntries.id, uuid.parse(id)));
  else await db.insert(timelineEntries).values(values);
  await audit(admin.id, id ? "timeline_update" : "timeline_create", "timeline", id);
  back(base, "Marco salvo.");
}

export async function deleteTimelineAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const id = uuid.parse(str(fd, "id"));
  await db.delete(timelineEntries).where(eq(timelineEntries.id, id));
  await audit(admin.id, "timeline_delete", "timeline", id);
  back("/admin/conteudo/trajetoria", "Marco removido.");
}

export async function saveSiteSettingsAction(fd: FormData) {
  const admin = await requireAdmin("admin");
  const current = await getSiteSettings();
  const num = (k: string) => {
    const v = str(fd, k).replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  let photoUrl: string | null = null;
  try {
    photoUrl = await uploadPublicImage(fd, "aboutPhoto");
  } catch (err) {
    if (err instanceof UploadError) back("/admin/conteudo/empresa", err.message, "error");
    throw err;
  }
  const removePhotos = fd.getAll("removePhoto").map(String);
  const photos = current.about.photos.filter((p) => !removePhotos.includes(p.url));
  if (photoUrl) photos.push({ url: photoUrl, alt: str(fd, "aboutPhotoAlt") || "Oficina DS Hidráulica", isDemo: false });

  const next = siteSettingsSchema.safeParse({
    ...current,
    companyName: str(fd, "companyName") || "DS Hidráulica",
    legalName: str(fd, "legalName"),
    cnpj: str(fd, "cnpj"),
    yearsOfExperience: Number(str(fd, "yearsOfExperience") || current.yearsOfExperience),
    whatsappNumber: str(fd, "whatsappNumber").replace(/\D/g, ""),
    phone: str(fd, "phone").replace(/\D/g, ""),
    email: str(fd, "email"),
    instagramUrl: str(fd, "instagramUrl") || current.instagramUrl,
    facebookUrl: str(fd, "facebookUrl"),
    youtubeUrl: str(fd, "youtubeUrl"),
    hoursText: str(fd, "hoursText"),
    visitFeeNote: str(fd, "visitFeeNote"),
    address: {
      street: str(fd, "street"),
      number: str(fd, "number"),
      complement: str(fd, "complement"),
      district: str(fd, "district"),
      city: str(fd, "city"),
      state: str(fd, "state").toUpperCase(),
      postalCode: str(fd, "postalCode"),
      mapsUrl: str(fd, "mapsUrl"),
      latitude: num("latitude"),
      longitude: num("longitude"),
      confirmed: bool(fd, "addressConfirmed"),
    },
    hero: { title: str(fd, "heroTitle") || current.hero.title, subtitle: str(fd, "heroSubtitle") || current.hero.subtitle },
    about: { title: str(fd, "aboutTitle") || current.about.title, text: str(fd, "aboutText") || current.about.text, photos },
    coverage: {
      cities: lines(fd, "coverageCities"),
      centerLat: num("centerLat"),
      centerLng: num("centerLng"),
      radiusKm: num("radiusKm"),
      description: str(fd, "coverageDescription"),
    },
    seo: { city: str(fd, "seoCity"), region: str(fd, "seoRegion"), description: str(fd, "seoDescription") || current.seo.description },
  });
  if (!next.success) back("/admin/conteudo/empresa", "Revise os dados informados.", "error");
  if (next.data.whatsappNumber && next.data.whatsappNumber.length < 12)
    back("/admin/conteudo/empresa", "WhatsApp deve incluir DDI e DDD, ex.: 5511999998888.", "error");
  await db.insert(siteSettings).values({ key: "site", value: next.data }).onConflictDoUpdate({ target: siteSettings.key, set: { value: next.data } });
  await audit(admin.id, "site_settings", "site_settings", "site");
  back("/admin/conteudo/empresa", "Dados da empresa salvos.");
}

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

export async function createAdminAction(fd: FormData) {
  const me = await requireAdmin("owner");
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const password = String(fd.get("password") ?? "");
  const role = z.enum(["owner", "admin", "staff"]).catch("staff").parse(str(fd, "role"));
  if (!z.email().safeParse(email).success || name.length < 2) back("/admin/usuarios", "Informe nome e e-mail válidos.", "error");
  const problem = passwordProblems(password);
  if (problem) back("/admin/usuarios", problem, "error");
  try {
    const [row] = await db.insert(admins).values({ email, name, role, passwordHash: await hashPassword(password) }).returning({ id: admins.id });
    await audit(me.id, "admin_create", "admin", row.id, { email, role });
  } catch {
    back("/admin/usuarios", "Já existe um usuário com este e-mail.", "error");
  }
  back("/admin/usuarios", "Usuário criado.");
}

export async function updateAdminAction(fd: FormData) {
  const me = await requireAdmin("owner");
  const id = uuid.parse(str(fd, "id"));
  const role = z.enum(["owner", "admin", "staff"]).parse(str(fd, "role"));
  const active = bool(fd, "active");
  if (id === me.id && (role !== "owner" || !active)) back("/admin/usuarios", "Você não pode remover o próprio acesso de proprietário.", "error");
  const password = String(fd.get("password") ?? "");
  const set: Partial<typeof admins.$inferInsert> = { role, active };
  if (password) {
    const problem = passwordProblems(password);
    if (problem) back("/admin/usuarios", problem, "error");
    set.passwordHash = await hashPassword(password);
  }
  const [cur] = await db.select().from(admins).where(eq(admins.id, id));
  // mudanças de acesso encerram as sessões abertas do usuário
  set.sessionVersion = cur.sessionVersion + 1;
  await db.update(admins).set(set).where(eq(admins.id, id));
  await audit(me.id, "admin_update", "admin", id, { role, active, passwordChanged: !!password });
  back("/admin/usuarios", "Usuário atualizado.");
}

export async function changeOwnPasswordAction(fd: FormData) {
  const me = await requireAdmin("staff");
  const [row] = await db.select().from(admins).where(eq(admins.id, me.id));
  if (!(await verifyPassword(String(fd.get("current") ?? ""), row.passwordHash))) back("/admin/conta", "Senha atual incorreta.", "error");
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblems(password);
  if (problem) back("/admin/conta", problem, "error");
  if (password !== String(fd.get("confirm") ?? "")) back("/admin/conta", "A confirmação não confere.", "error");
  await db.update(admins).set({ passwordHash: await hashPassword(password), sessionVersion: row.sessionVersion + 1 }).where(eq(admins.id, me.id));
  await audit(me.id, "password_change", "admin", me.id);
  redirect("/admin/login");
}
