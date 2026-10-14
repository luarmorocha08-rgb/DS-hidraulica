import { desc } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { testimonials, type Testimonial } from "@/db/schema";
import { deleteTestimonialAction, saveTestimonialAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Depoimentos" };

function TForm({ t }: { t?: Testimonial }) {
  return (
    <form action={saveTestimonialAction} className="grid gap-3 sm:grid-cols-4">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="Nome" className="sm:col-span-2"><input name="name" defaultValue={t?.name} required className={inputCls} /></Field>
      <Field label="Nota (1–5)"><input type="number" name="rating" min={1} max={5} defaultValue={t?.rating ?? 5} className={inputCls} /></Field>
      <Field label="Data"><input type="date" name="reviewDate" defaultValue={t?.reviewDate} required className={inputCls} /></Field>
      <Field label="Comentário" className="sm:col-span-4"><textarea name="comment" rows={3} defaultValue={t?.comment} required className={inputCls} /></Field>
      <Field label="Serviço realizado"><input name="serviceName" defaultValue={t?.serviceName ?? ""} className={inputCls} /></Field>
      <Field label="Origem (ex.: Google)"><input name="source" defaultValue={t?.source ?? ""} className={inputCls} /></Field>
      <Field label="Link da avaliação pública" className="sm:col-span-2"><input name="sourceUrl" defaultValue={t?.sourceUrl ?? ""} className={inputCls} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={t?.published ?? false} className="accent-[#f47712]" /> Publicado</label>
      <div className="sm:col-span-3"><SubmitButton variant={t ? "secondary" : "primary"}>{t ? "Salvar" : "Adicionar"}</SubmitButton></div>
    </form>
  );
}

export default async function TestimonialsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const rows = await db.select().from(testimonials).orderBy(desc(testimonials.reviewDate));
  return (
    <AdminPage title="Depoimentos" description="Cadastre apenas avaliações reais de clientes, com autorização. Sem depoimentos publicados, a seção fica oculta no site.">
      <Flash msg={sp.msg} error={sp.error} />
      <Card title="Novo depoimento"><TForm /></Card>
      <div className="mt-6 space-y-4">
        {rows.map((t) => (
          <Card key={t.id} title={t.name} actions={<form action={deleteTestimonialAction}><input type="hidden" name="id" value={t.id} /><SubmitButton variant="danger" confirm="Remover?">Remover</SubmitButton></form>}>
            <TForm t={t} />
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
