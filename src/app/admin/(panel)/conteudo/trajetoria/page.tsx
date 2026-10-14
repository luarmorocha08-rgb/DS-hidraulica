import { asc } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { timelineEntries, type TimelineEntry } from "@/db/schema";
import { deleteTimelineAction, saveTimelineAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Trajetória" };

function TForm({ t }: { t?: TimelineEntry }) {
  return (
    <form action={saveTimelineAction} className="grid gap-3 sm:grid-cols-[120px_1fr_80px]">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Período"><input name="period" defaultValue={t?.period} placeholder="2019" required className={inputCls} /></Field>
      <Field label="Título"><input name="title" defaultValue={t?.title} required className={inputCls} /></Field>
      <Field label="Ordem"><input type="number" name="sortOrder" defaultValue={t?.sortOrder ?? 0} className={inputCls} /></Field>
      <Field label="Descrição" className="sm:col-span-3"><textarea name="description" rows={2} defaultValue={t?.description} className={inputCls} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={t?.published ?? true} className="accent-[#f47712]" /> Publicado</label>
      <div className="sm:col-span-2"><SubmitButton variant={t ? "secondary" : "primary"}>{t ? "Salvar" : "Adicionar marco"}</SubmitButton></div>
    </form>
  );
}

export default async function TimelineAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const rows = await db.select().from(timelineEntries).orderBy(asc(timelineEntries.sortOrder));
  return (
    <AdminPage title="Trajetória da empresa" description="Linha do tempo exibida na seção Sobre. Use apenas fatos reais da história da DS Hidráulica.">
      <Flash msg={sp.msg} error={sp.error} />
      <Card title="Novo marco"><TForm /></Card>
      <div className="mt-6 space-y-4">
        {rows.map((t) => (
          <Card key={t.id} title={`${t.period} — ${t.title}`} actions={<form action={deleteTimelineAction}><input type="hidden" name="id" value={t.id} /><SubmitButton variant="danger" confirm="Remover?">Remover</SubmitButton></form>}>
            <TForm t={t} />
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
