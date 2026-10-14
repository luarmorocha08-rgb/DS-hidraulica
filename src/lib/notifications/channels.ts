import "server-only";

/**
 * Integrações oficiais. Cada função retorna "skipped" quando a integração não
 * está configurada — nada é simulado como enviado.
 */
export type SendResult = { status: "sent" } | { status: "skipped"; reason: string } | { status: "failed"; reason: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, reason: `HTTP ${res.status} ${text.slice(0, 300)}` };
    }
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!emailConfigured()) return { status: "skipped", reason: "E-mail não configurado (RESEND_API_KEY/EMAIL_FROM)." };
  const res = await postJson(
    "https://api.resend.com/emails",
    { from: process.env.EMAIL_FROM, to: [to], subject, text },
    { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  );
  return res.ok ? { status: "sent" } : { status: "failed", reason: res.reason };
}

/**
 * Mensagens iniciadas pela empresa no WhatsApp exigem template aprovado pela Meta.
 * Os parâmetros preenchem as variáveis {{1}}, {{2}}… do corpo do template.
 */
export async function sendWhatsappTemplate(
  to: string,
  template: string | undefined,
  params: string[],
): Promise<SendResult> {
  if (!whatsappConfigured()) {
    return { status: "skipped", reason: "WhatsApp Business Platform não configurado." };
  }
  if (!template) return { status: "skipped", reason: "Template de WhatsApp não configurado para este evento." };
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";
  const res = await postJson(
    `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "pt_BR" },
        components: [
          { type: "body", parameters: params.map((p) => ({ type: "text", text: p.slice(0, 1000) })) },
        ],
      },
    },
    { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}` },
  );
  return res.ok ? { status: "sent" } : { status: "failed", reason: res.reason };
}
