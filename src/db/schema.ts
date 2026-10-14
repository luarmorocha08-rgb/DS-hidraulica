import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const adminRole = pgEnum("admin_role", ["owner", "admin", "staff"]);

export const appointmentStatus = pgEnum("appointment_status", [
  "pending", // aguardando confirmação da oficina
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "no_show",
]);

export const modality = pgEnum("modality", ["workshop", "onsite"]);

export const visitStatus = pgEnum("visit_status", [
  "received",
  "in_review",
  "awaiting_confirmation",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const quoteStatus = pgEnum("quote_status", [
  "new",
  "in_review",
  "pending_info",
  "sent",
  "approved",
  "rejected",
  "finished",
]);

export const urgency = pgEnum("urgency", ["low", "normal", "high", "urgent"]);

export const coverage = pgEnum("coverage", ["inside", "outside", "unknown"]);

export const vehicleType = pgEnum("vehicle_type", [
  "caminhao",
  "onibus",
  "utilitario",
  "maquina",
  "outro",
]);

export const galleryCategory = pgEnum("gallery_category", [
  "caixas",
  "bombas",
  "caminhoes",
  "componentes",
  "oficina",
  "antes_depois",
]);

export const mediaType = pgEnum("media_type", ["image", "video"]);

export const notificationChannel = pgEnum("notification_channel", [
  "email",
  "whatsapp",
]);

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "skipped",
]);

export const requestKind = pgEnum("request_kind", [
  "appointment",
  "visit",
  "quote",
]);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Administração                                                       */
/* ------------------------------------------------------------------ */

export const admins = pgTable("admins", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    adminId: uuid("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Clientes e veículos                                                 */
/* ------------------------------------------------------------------ */

export const customers = pgTable(
  "customers",
  {
    id: id(),
    name: text("name").notNull(),
    /** Somente dígitos, com DDI 55. Ex.: 5511999998888 */
    phone: text("phone").notNull(),
    email: text("email"),
    internalNotes: text("internal_notes"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("customers_phone_uq").on(t.phone)],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    type: vehicleType("type").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    year: smallint("year"),
    createdAt: createdAt(),
  },
  (t) => [index("vehicles_customer_idx").on(t.customerId)],
);

/* ------------------------------------------------------------------ */
/* Conteúdo do site                                                    */
/* ------------------------------------------------------------------ */

export const services = pgTable("services", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  benefits: text("benefits").array().notNull().default(sql`'{}'::text[]`),
  symptoms: text("symptoms").array().notNull().default(sql`'{}'::text[]`),
  icon: text("icon").notNull().default("wrench"),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  isDemoImage: boolean("is_demo_image").notNull().default(true),
  whatsappMessage: text("whatsapp_message"),
  /** Os serviços iniciais são sugestões; a empresa marca como revisado. */
  reviewed: boolean("reviewed").notNull().default(false),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const galleryItems = pgTable("gallery_items", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  category: galleryCategory("category").notNull(),
  mediaType: mediaType("media_type").notNull().default("image"),
  url: text("url").notNull(),
  posterUrl: text("poster_url"),
  alt: text("alt").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const testimonials = pgTable(
  "testimonials",
  {
    id: id(),
    name: text("name").notNull(),
    rating: smallint("rating").notNull(),
    comment: text("comment").notNull(),
    reviewDate: date("review_date").notNull(),
    serviceName: text("service_name"),
    /** Origem verificável (ex.: Google). */
    source: text("source"),
    sourceUrl: text("source_url"),
    published: boolean("published").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [check("testimonials_rating_ck", sql`${t.rating} between 1 and 5`)],
);

export const timelineEntries = pgTable("timeline_entries", {
  id: id(),
  period: text("period").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Agenda                                                              */
/* ------------------------------------------------------------------ */

export const bookingTypes = pgTable("booking_types", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  allowWorkshop: boolean("allow_workshop").notNull().default(true),
  allowOnsite: boolean("allow_onsite").notNull().default(true),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const businessHours = pgTable(
  "business_hours",
  {
    /** 0 = domingo … 6 = sábado */
    weekday: smallint("weekday").primaryKey(),
    isOpen: boolean("is_open").notNull().default(false),
    /** "HH:MM" no fuso da empresa */
    openTime: text("open_time").notNull().default("08:00"),
    closeTime: text("close_time").notNull().default("18:00"),
    breakStart: text("break_start"),
    breakEnd: text("break_end"),
  },
  (t) => [check("business_hours_weekday_ck", sql`${t.weekday} between 0 and 6`)],
);

export const scheduleSettings = pgTable(
  "schedule_settings",
  {
    id: smallint("id").primaryKey().default(1),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    capacity: integer("capacity").notNull().default(1),
    minLeadHours: integer("min_lead_hours").notNull().default(2),
    maxDaysAhead: integer("max_days_ahead").notNull().default(45),
    /** Se verdadeiro, agendamentos na oficina já entram como confirmados. */
    autoConfirmWorkshop: boolean("auto_confirm_workshop").notNull().default(false),
    /** Antecedência mínima para o cliente cancelar/reagendar pelo site. */
    customerChangeLeadHours: integer("customer_change_lead_hours")
      .notNull()
      .default(4),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("schedule_settings_singleton_ck", sql`${t.id} = 1`),
    check("schedule_settings_capacity_ck", sql`${t.capacity} >= 1`),
  ],
);

export const holidays = pgTable("holidays", {
  id: id(),
  date: date("date").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: id(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => admins.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("schedule_blocks_range_idx").on(t.startsAt, t.endsAt),
    check("schedule_blocks_range_ck", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/* ------------------------------------------------------------------ */
/* Solicitações                                                        */
/* ------------------------------------------------------------------ */

const addressColumns = () => ({
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  district: text("district"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  reference: text("reference"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
});

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    protocol: text("protocol").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    bookingTypeId: uuid("booking_type_id")
      .notNull()
      .references(() => bookingTypes.id),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    modality: modality("modality").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    problemDescription: text("problem_description").notNull(),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    ...addressColumns(),
    coverage: coverage("coverage"),
    source: text("source").notNull().default("site"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("appointments_starts_idx").on(t.startsAt),
    index("appointments_status_idx").on(t.status),
    index("appointments_customer_idx").on(t.customerId),
    check("appointments_range_ck", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const visitRequests = pgTable(
  "visit_requests",
  {
    id: id(),
    protocol: text("protocol").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    status: visitStatus("status").notNull().default("received"),
    problemDescription: text("problem_description").notNull(),
    ...addressColumns(),
    coverage: coverage("coverage").notNull().default("unknown"),
    preferredDate: date("preferred_date"),
    preferredPeriod: text("preferred_period"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    travelFeeNote: text("travel_fee_note"),
    internalNotes: text("internal_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("visit_requests_status_idx").on(t.status),
    index("visit_requests_customer_idx").on(t.customerId),
  ],
);

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: id(),
    protocol: text("protocol").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    serviceType: text("service_type").notNull(),
    problemDescription: text("problem_description").notNull(),
    urgency: urgency("urgency").notNull().default("normal"),
    status: quoteStatus("status").notNull().default("new"),
    responseNote: text("response_note"),
    internalNotes: text("internal_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("quote_requests_status_idx").on(t.status),
    index("quote_requests_customer_idx").on(t.customerId),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    kind: requestKind("kind").notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "cascade",
    }),
    visitId: uuid("visit_id").references(() => visitRequests.id, {
      onDelete: "cascade",
    }),
    quoteId: uuid("quote_id").references(() => quoteRequests.id, {
      onDelete: "cascade",
    }),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "attachments_one_parent_ck",
      sql`num_nonnulls(${t.appointmentId}, ${t.visitId}, ${t.quoteId}) = 1`,
    ),
  ],
);

export const requestEvents = pgTable(
  "request_events",
  {
    id: id(),
    kind: requestKind("kind").notNull(),
    requestId: uuid("request_id").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    /** "customer" | "system" | "admin:<uuid>" */
    actor: text("actor").notNull(),
    /** Visível ao cliente na página de acompanhamento? */
    visibleToCustomer: boolean("visible_to_customer").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("request_events_req_idx").on(t.kind, t.requestId)],
);

/* ------------------------------------------------------------------ */
/* Infraestrutura                                                      */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    channel: notificationChannel("channel").notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    error: text("error"),
    relatedKind: requestKind("related_kind"),
    relatedId: uuid("related_id"),
    attempts: integer("attempts").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_status_idx").on(t.status)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type Admin = typeof admins.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Service = typeof services.$inferSelect;
export type BookingType = typeof bookingTypes.$inferSelect;
export type BusinessHour = typeof businessHours.$inferSelect;
export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type VisitRequest = typeof visitRequests.$inferSelect;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
export type VisitStatus = (typeof visitStatus.enumValues)[number];
export type QuoteStatus = (typeof quoteStatus.enumValues)[number];
export type AdminRole = (typeof adminRole.enumValues)[number];
export type RequestKind = (typeof requestKind.enumValues)[number];
