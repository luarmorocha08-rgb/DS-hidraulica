import { asc, eq, and } from "drizzle-orm";
import { FileText, Film, ImageIcon } from "lucide-react";
import { db } from "@/db";
import { admins, attachments, requestEvents, type RequestKind } from "@/db/schema";
import { formatDateTime } from "@/lib/time";
import { Card } from "./ui";

export async function Attachments({ kind, id }: { kind: RequestKind; id: string }) {
  const col = kind === "appointment" ? attachments.appointmentId : kind === "visit" ? attachments.visitId : attachments.quoteId;
  const files = await db.select().from(attachments).where(eq(col, id)).orderBy(asc(attachments.createdAt));
  return (
    <Card title={`Anexos (${files.length})`}>
      {!files.length ? (
        <p className="text-sm text-silver-dim">O cliente não enviou arquivos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f) => (
            <li key={f.id}>
              <a href={`/api/files/${f.id}`} target="_blank" rel="noopener" className="group block overflow-hidden rounded-md border border-white/10 hover:border-orange">
                {f.mimeType.startsWith("image/") && f.mimeType !== "image/heic" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${f.id}`} alt={f.originalName} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex aspect-square items-center justify-center bg-white/5 text-silver">
                    {f.mimeType.startsWith("video/") ? <Film className="size-8" /> : f.mimeType.startsWith("image/") ? <ImageIcon className="size-8" /> : <FileText className="size-8" />}
                  </span>
                )}
                <span className="block truncate px-2 py-1 text-xs text-silver">{f.originalName}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export async function History({ kind, id, tz, labels }: { kind: RequestKind; id: string; tz: string; labels: Record<string, { label: string }> }) {
  const events = await db
    .select({ e: requestEvents, adminName: admins.name })
    .from(requestEvents)
    .leftJoin(admins, eq(admins.id, sqlAdminId(requestEvents.actor)))
    .where(and(eq(requestEvents.kind, kind), eq(requestEvents.requestId, id)))
    .orderBy(asc(requestEvents.createdAt));
  return (
    <Card title="Histórico">
      <ol className="space-y-4 border-l border-orange/40 pl-5">
        {events.map(({ e, adminName }) => (
          <li key={e.id} className="relative text-sm">
            <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-orange" />
            <p className="font-semibold">
              {e.fromStatus ? `${labels[e.fromStatus]?.label ?? e.fromStatus} → ` : ""}
              {labels[e.toStatus]?.label ?? e.toStatus}
            </p>
            <p className="text-xs text-silver-dim">
              {formatDateTime(e.createdAt, tz)} · {e.actor === "customer" ? "cliente" : e.actor === "system" ? "sistema" : adminName ?? "equipe"}
            </p>
            {e.note && <p className="mt-1 text-silver">{e.note}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
function sqlAdminId(actor: PgColumn): SQL<string> {
  // actor = "admin:<uuid>" → uuid
  return sql`(case when ${actor} like 'admin:%' then substring(${actor} from 7)::uuid end)`;
}

export function NotifyCheckbox() {
  return (
    <label className="flex items-center gap-2 text-sm text-silver">
      <input type="checkbox" name="notify" defaultChecked className="accent-[#f47712]" /> Avisar o cliente (e-mail/WhatsApp, se configurados)
    </label>
  );
}
