import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { SERVICE_ICON_NAMES, ServiceIcon } from "@/components/brand/ServiceIcon";
import { db } from "@/db";
import { services, type Service } from "@/db/schema";
import { deleteServiceAction, saveServiceAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Editar serviço" };

export default async function ServiceEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const { id } = await params;
  const sp = await searchParams;
  let s: Service | null = null;
  if (id !== "novo") {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    [s] = await db.select().from(services).where(eq(services.id, id));
    if (!s) notFound();
  }
  return (
    <AdminPage title={s ? s.name : "Novo serviço"} back={{ href: "/admin/conteudo/servicos", label: "Serviços" }}>
      <Flash msg={sp.msg} error={sp.error} />
      <form action={saveServiceAction} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {s && <input type="hidden" name="id" value={s.id} />}
        <Card title="Conteúdo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2"><input name="name" defaultValue={s?.name} required className={inputCls} /></Field>
            <Field label="Endereço (slug)"><input name="slug" defaultValue={s?.slug} placeholder="gerado a partir do nome" className={inputCls} /></Field>
            <Field label="Ordem"><input type="number" name="sortOrder" defaultValue={s?.sortOrder ?? 0} className={inputCls} /></Field>
            <Field label="Resumo (cartão)" className="sm:col-span-2"><input name="shortDescription" defaultValue={s?.shortDescription} maxLength={200} className={inputCls} /></Field>
            <Field label="Descrição completa" className="sm:col-span-2"><textarea name="description" rows={5} defaultValue={s?.description} className={inputCls} /></Field>
            <Field label="Benefícios (um por linha)"><textarea name="benefits" rows={4} defaultValue={s?.benefits.join("\n")} className={inputCls} /></Field>
            <Field label="Sintomas relacionados (um por linha)"><textarea name="symptoms" rows={4} defaultValue={s?.symptoms.join("\n")} className={inputCls} /></Field>
            <Field label="Mensagem de WhatsApp (opcional)" className="sm:col-span-2"><input name="whatsappMessage" defaultValue={s?.whatsappMessage ?? ""} className={inputCls} /></Field>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Publicação">
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="reviewed" defaultChecked={s?.reviewed ?? true} className="accent-[#f47712]" /> Revisado e confirmado pela empresa</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={s?.published ?? true} className="accent-[#f47712]" /> Exibir no site</label>
            </div>
          </Card>
          <Card title="Imagem">
            {s?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt={s.imageAlt ?? ""} className="mb-3 aspect-video w-full rounded-md object-cover" />
            )}
            <div className="space-y-3">
              <Field label="Enviar foto"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
              <Field label="ou URL da imagem"><input name="imageUrl" defaultValue={s?.imageUrl ?? ""} className={inputCls} /></Field>
              <Field label="Texto alternativo"><input name="imageAlt" defaultValue={s?.imageAlt ?? ""} className={inputCls} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDemoImage" defaultChecked={s?.isDemoImage ?? false} className="accent-[#f47712]" /> Imagem ilustrativa (mostra o selo no site)</label>
              {s?.imageUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" /> Remover imagem</label>}
            </div>
          </Card>
          <Card title="Ícone (sem imagem)">
            <div className="grid grid-cols-6 gap-2">
              {SERVICE_ICON_NAMES.map((n) => (
                <label key={n} className="flex cursor-pointer items-center justify-center rounded-md border border-white/10 p-2 has-[:checked]:border-orange has-[:checked]:text-orange">
                  <input type="radio" name="icon" value={n} defaultChecked={(s?.icon ?? "wrench") === n} className="sr-only" />
                  <ServiceIcon name={n} className="size-6" />
                </label>
              ))}
            </div>
          </Card>
          <SubmitButton>Salvar serviço</SubmitButton>
        </div>
      </form>
      {s && (
        <form action={deleteServiceAction} className="mt-8">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton variant="danger" confirm="Excluir este serviço? Agendamentos que o citam continuam existindo.">Excluir serviço</SubmitButton>
        </form>
      )}
    </AdminPage>
  );
}
