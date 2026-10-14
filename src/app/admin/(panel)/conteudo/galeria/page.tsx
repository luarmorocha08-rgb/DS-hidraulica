import { asc } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { galleryItems, type GalleryItem } from "@/db/schema";
import { deleteGalleryItemAction, saveGalleryItemAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { GALLERY_CATEGORIES } from "@/lib/labels";

export const metadata = { title: "Galeria" };

function ItemForm({ item }: { item?: GalleryItem }) {
  return (
    <form action={saveGalleryItemAction} className="grid gap-3 sm:grid-cols-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      {item && <input type="hidden" name="url" value={item.url} />}
      {item && <input type="hidden" name="mediaType" value={item.mediaType} />}
      {!item && (
        <>
          <Field label="Foto ou vídeo curto"><input type="file" name="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="text-sm" /></Field>
          <Field label="ou URL"><input name="url" className={inputCls} /></Field>
        </>
      )}
      <Field label="Título"><input name="title" defaultValue={item?.title} required className={inputCls} /></Field>
      <Field label="Categoria">
        <select name="category" defaultValue={item?.category ?? "oficina"} className={inputCls}>{GALLERY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      </Field>
      <Field label="Descrição do trabalho" className="sm:col-span-2"><input name="description" defaultValue={item?.description ?? ""} className={inputCls} /></Field>
      <Field label="Texto alternativo"><input name="alt" defaultValue={item?.alt} className={inputCls} /></Field>
      <Field label="Capa do vídeo (URL, opcional)"><input name="posterUrl" defaultValue={item?.posterUrl ?? ""} className={inputCls} /></Field>
      <Field label="Ordem"><input type="number" name="sortOrder" defaultValue={item?.sortOrder ?? 0} className={inputCls} /></Field>
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={item?.published ?? true} className="accent-[#f47712]" /> Publicado</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isDemo" defaultChecked={item?.isDemo ?? false} className="accent-[#f47712]" /> Demonstração</label>
      </div>
      <div className="sm:col-span-2"><SubmitButton variant={item ? "secondary" : "primary"}>{item ? "Salvar" : "Adicionar à galeria"}</SubmitButton></div>
    </form>
  );
}

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const items = await db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder));
  return (
    <AdminPage title="Galeria" description="A seção “Nosso trabalho na prática” só aparece no site quando há itens publicados.">
      <Flash msg={sp.msg} error={sp.error} />
      <Card title="Adicionar"><ItemForm /></Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id} title={it.title} actions={
            <form action={deleteGalleryItemAction}><input type="hidden" name="id" value={it.id} /><SubmitButton variant="danger" confirm="Remover este item?">Remover</SubmitButton></form>
          }>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              {it.mediaType === "video" ? (
                <video src={it.url} poster={it.posterUrl ?? undefined} className="aspect-square w-full rounded-md object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={it.alt} className="aspect-square w-full rounded-md object-cover" />
              )}
              <ItemForm item={it} />
            </div>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}
