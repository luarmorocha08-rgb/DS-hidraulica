import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type RequestKind } from "@/db/schema";
import { sendEmail, sendWhatsappTemplate, type SendResult } from "./channels";

const KIND_LABEL: Record<RequestKind, string> = {
  appointment: "agendamento",
  visit: "solicitação de visita",
  quote: "pedido de orçamento",
};

export type NotificationEvent =
  | {
      type: "request_created";
      kind: RequestKind;
      requestId: string;
      protocol: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      statusLabel: string;
      details: string;
    }
  | {
      type: "status_changed";
      kind: RequestKind;
      requestId: string;
      protocol: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      statusLabel: string;
      note?: string | null;
    }
  | {
      type: "reminder";
      requestId: string;
      protocol: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      whenText: string;
      modalityLabel: string;
    };

interface Message {
  channel: "email" | "whatsapp";
  recipient: string;
  template: string;
  subject?: string;
  text: string;
  waTemplate?: string;
  waParams?: string[];
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

export function buildMessages(event: NotificationEvent): Message[] {
  const out: Message[] = [];
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  const adminWa = process.env.WHATSAPP_ADMIN_NUMBER;
  const trackUrl = `${siteUrl()}/acompanhar?protocolo=${event.protocol}`;

  if (event.type === "request_created") {
    const kind = KIND_LABEL[event.kind];
    const adminText = `Nova ${kind} pelo site.\nProtocolo: ${event.protocol}\nCliente: ${event.customerName}\nTelefone: +${event.customerPhone}\n\n${event.details}\n\nAbrir no painel: ${siteUrl()}/admin`;
    if (adminEmail)
      out.push({ channel: "email", recipient: adminEmail, template: "admin_new_request", subject: `[Site] Nova ${kind} — ${event.protocol}`, text: adminText });
    if (adminWa)
      out.push({
        channel: "whatsapp",
        recipient: adminWa,
        template: "admin_new_request",
        text: adminText,
        waTemplate: process.env.WHATSAPP_TEMPLATE_ADMIN_ALERT,
        waParams: [kind, event.protocol, event.customerName],
      });
    const customerText = `Olá, ${event.customerName}!\n\nRecebemos seu ${kind} na DS Hidráulica.\nProtocolo: ${event.protocol}\nSituação: ${event.statusLabel}\n\n${event.details}\n\nAcompanhe em: ${trackUrl}`;
    if (event.customerEmail)
      out.push({ channel: "email", recipient: event.customerEmail, template: "customer_request_received", subject: `DS Hidráulica — protocolo ${event.protocol}`, text: customerText });
    out.push({
      channel: "whatsapp",
      recipient: event.customerPhone,
      template: "customer_request_received",
      text: customerText,
      waTemplate: process.env.WHATSAPP_TEMPLATE_STATUS,
      waParams: [event.customerName, event.protocol, event.statusLabel],
    });
  }

  if (event.type === "status_changed") {
    const text = `Olá, ${event.customerName}!\n\nSeu ${KIND_LABEL[event.kind]} ${event.protocol} foi atualizado.\nSituação: ${event.statusLabel}${event.note ? `\n\n${event.note}` : ""}\n\nAcompanhe em: ${trackUrl}`;
    if (event.customerEmail)
      out.push({ channel: "email", recipient: event.customerEmail, template: "customer_status_changed", subject: `DS Hidráulica — ${event.protocol}: ${event.statusLabel}`, text });
    out.push({
      channel: "whatsapp",
      recipient: event.customerPhone,
      template: "customer_status_changed",
      text,
      waTemplate: process.env.WHATSAPP_TEMPLATE_STATUS,
      waParams: [event.customerName, event.protocol, event.statusLabel],
    });
  }

  if (event.type === "reminder") {
    const text = `Olá, ${event.customerName}!\n\nLembrete do seu atendimento na DS Hidráulica:\n${event.modalityLabel} — ${event.whenText}\nProtocolo: ${event.protocol}\n\nPrecisa reagendar? ${trackUrl}`;
    if (event.customerEmail)
      out.push({ channel: "email", recipient: event.customerEmail, template: "customer_reminder", subject: `Lembrete: atendimento ${event.whenText}`, text });
    out.push({
      channel: "whatsapp",
      recipient: event.customerPhone,
      template: "customer_reminder",
      text,
      waTemplate: process.env.WHATSAPP_TEMPLATE_REMINDER,
      waParams: [event.customerName, event.whenText, event.protocol],
    });
  }

  return out;
}

async function deliver(m: Message): Promise<SendResult> {
  if (m.channel === "email") return sendEmail(m.recipient, m.subject ?? "DS Hidráulica", m.text);
  return sendWhatsappTemplate(m.recipient, m.waTemplate, m.waParams ?? []);
}

/** Registra e tenta enviar as notificações de um evento. Nunca lança erro. */
export async function dispatchNotification(event: NotificationEvent) {
  const kind: RequestKind = event.type === "reminder" ? "appointment" : event.kind;
  for (const m of buildMessages(event)) {
    try {
      const [row] = await db
        .insert(notifications)
        .values({
          channel: m.channel,
          recipient: m.recipient,
          template: m.template,
          payload: { subject: m.subject, text: m.text, waTemplate: m.waTemplate, waParams: m.waParams },
          relatedKind: kind,
          relatedId: event.requestId,
        })
        .returning({ id: notifications.id });
      const result = await deliver(m);
      await db
        .update(notifications)
        .set({
          status: result.status,
          error: result.status === "sent" ? null : result.reason,
          attempts: 1,
          sentAt: result.status === "sent" ? new Date() : null,
        })
        .where(eq(notifications.id, row.id));
    } catch (err) {
      console.error("[notificações] falha ao registrar/enviar", err);
    }
  }
}

/** Reenvia notificações com falha (até 3 tentativas). Usado pelo cron. */
export async function retryFailedNotifications() {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.status, "failed"), lt(notifications.attempts, 3)))
    .limit(50);
  for (const row of rows) {
    const p = row.payload as { subject?: string; text: string; waTemplate?: string; waParams?: string[] };
    const result = await deliver({
      channel: row.channel,
      recipient: row.recipient,
      template: row.template,
      subject: p.subject,
      text: p.text,
      waTemplate: p.waTemplate,
      waParams: p.waParams,
    });
    await db
      .update(notifications)
      .set({
        status: result.status,
        error: result.status === "sent" ? null : result.reason,
        attempts: row.attempts + 1,
        sentAt: result.status === "sent" ? new Date() : null,
      })
      .where(eq(notifications.id, row.id));
  }
  return rows.length;
}
