import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { appointments, customers } from "@/db/schema";
import { MODALITY_LABEL } from "@/lib/labels";
import { dispatchNotification, retryFailedNotifications } from "@/lib/notifications";
import { getScheduleSettings } from "@/lib/schedule";
import { formatDateLong, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Lembretes de atendimento (~24h antes) e reenvio de notificações com falha.
 * Chame a cada hora com: Authorization: Bearer $CRON_SECRET
 * (Vercel Cron, GitHub Actions, cron do servidor…). Ver docs/DEPLOY.md.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const tz = (await getScheduleSettings()).timezone;
  const now = Date.now();
  const rows = await db
    .select({ a: appointments, c: customers })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        isNull(appointments.reminderSentAt),
        gte(appointments.startsAt, new Date(now + 2 * 3600000)),
        lt(appointments.startsAt, new Date(now + 26 * 3600000)),
      ),
    );
  for (const { a, c } of rows) {
    // marca antes de enviar para não duplicar em execuções concorrentes
    const [claimed] = await db
      .update(appointments)
      .set({ reminderSentAt: new Date() })
      .where(and(eq(appointments.id, a.id), isNull(appointments.reminderSentAt)))
      .returning({ id: appointments.id });
    if (!claimed) continue;
    await dispatchNotification({
      type: "reminder",
      requestId: a.id,
      protocol: a.protocol,
      customerName: c.name,
      customerPhone: c.phone,
      customerEmail: c.email,
      whenText: `${formatDateLong(a.startsAt, tz)}, ${formatTime(a.startsAt, tz)}`,
      modalityLabel: MODALITY_LABEL[a.modality],
    });
  }
  const retried = await retryFailedNotifications();
  return NextResponse.json({ reminders: rows.length, retried });
}
