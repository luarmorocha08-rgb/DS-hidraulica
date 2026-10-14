import "server-only";
import { db } from "@/db";
import { auditLogs, requestEvents, type RequestKind } from "@/db/schema";
import { clientIp } from "./request";

export async function audit(
  adminId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    adminId,
    action,
    entityType,
    entityId,
    details,
    ip: await clientIp().catch(() => null),
  });
}

export async function recordEvent(event: {
  kind: RequestKind;
  requestId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  note?: string | null;
  visibleToCustomer?: boolean;
}) {
  await db.insert(requestEvents).values({
    ...event,
    note: event.note ?? null,
    visibleToCustomer: event.visibleToCustomer ?? true,
  });
}
