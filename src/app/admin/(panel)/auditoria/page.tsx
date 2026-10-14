import { desc, eq } from "drizzle-orm";
import { AdminPage, Card, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/db";
import { admins, auditLogs, notifications } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { emailConfigured, whatsappConfigured } from "@/lib/notifications/channels";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Auditoria e envios" };

const NOTIF_TONE = { sent: "success", failed: "danger", skipped: "muted", pending: "warning" } as const;
const NOTIF_LABEL = { sent: "Enviado", failed: "Falhou", skipped: "Não enviado", pending: "Pendente" };

export default async function AuditPage() {
  await requireAdmin("admin");
  const tz = "America/Sao_Paulo";
  const [logs, notifs] = await Promise.all([
    db.select({ l: auditLogs, name: admins.name }).from(auditLogs).leftJoin(admins, eq(admins.id, auditLogs.adminId)).orderBy(desc(auditLogs.createdAt)).limit(150),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(80),
  ]);
  return (
    <AdminPage title="Auditoria e envios">
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card title="E-mail transacional">{emailConfigured() ? <Badge tone="success">Configurado</Badge> : <><Badge>Não configurado</Badge><p className="mt-2 text-xs text-silver-dim">Defina RESEND_API_KEY, EMAIL_FROM e ADMIN_NOTIFY_EMAIL (veja docs/DEPLOY.md).</p></>}</Card>
        <Card title="WhatsApp Business Platform">{whatsappConfigured() ? <Badge tone="success">Configurado</Badge> : <><Badge>Não configurado</Badge><p className="mt-2 text-xs text-silver-dim">Defina WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID e os templates aprovados.</p></>}</Card>
      </div>
      <Card title="Notificações recentes" className="mb-6">
        <Table head={["Quando", "Canal", "Para", "Mensagem", "Situação"]} empty={!notifs.length}>
          {notifs.map((n) => (
            <tr key={n.id}>
              <Td>{formatDateTime(n.createdAt, tz)}</Td>
              <Td>{n.channel === "email" ? "E-mail" : "WhatsApp"}</Td>
              <Td className="max-w-48 truncate">{n.recipient}</Td>
              <Td>{n.template}</Td>
              <Td><Badge tone={NOTIF_TONE[n.status]}>{NOTIF_LABEL[n.status]}</Badge>{n.error && <span className="mt-1 block max-w-64 text-xs text-silver-dim">{n.error}</span>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Alterações administrativas">
        <Table head={["Quando", "Usuário", "Ação", "Registro", "IP"]} empty={!logs.length}>
          {logs.map(({ l, name }) => (
            <tr key={l.id}>
              <Td>{formatDateTime(l.createdAt, tz)}</Td>
              <Td>{name ?? "—"}</Td>
              <Td className="font-tech tracking-wide">{l.action}</Td>
              <Td className="text-xs text-silver-dim">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</Td>
              <Td className="text-xs text-silver-dim">{l.ip}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </AdminPage>
  );
}
