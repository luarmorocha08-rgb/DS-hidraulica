import Link from "next/link";
import { asc } from "drizzle-orm";
import { AdminPage, Flash, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Serviços" };

export default async function ServicesAdmin({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const rows = await db.select().from(services).orderBy(asc(services.sortOrder));
  const pending = rows.filter((r) => !r.reviewed).length;
  return (
    <AdminPage title="Serviços" description="Catálogo exibido no site." actions={<Link href="/admin/conteudo/servicos/novo" className={buttonClass("primary", "sm")}>+ Novo serviço</Link>}>
      <Flash msg={sp.msg} error={sp.error} />
      {pending > 0 && (
        <p className="mb-5 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-[#ffd98a]">
          {pending} serviço(s) ainda são sugestões iniciais. Revise texto e imagem e marque “Revisado pela empresa”.
        </p>
      )}
      <Table head={["Ordem", "Serviço", "Imagem", "Revisão", "No site"]} empty={!rows.length}>
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-white/[0.02]">
            <Td>{s.sortOrder}</Td>
            <Td><Link href={`/admin/conteudo/servicos/${s.id}`} className="font-semibold hover:text-orange">{s.name}</Link><span className="block text-xs text-silver-dim">/servicos/{s.slug}</span></Td>
            <Td>{s.imageUrl ? (s.isDemoImage ? "Ilustrativa" : "Real") : "Ícone"}</Td>
            <Td>{s.reviewed ? <Badge tone="success">Revisado</Badge> : <Badge tone="warning">Sugestão</Badge>}</Td>
            <Td>{s.published ? <Badge tone="info">Publicado</Badge> : <Badge>Oculto</Badge>}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
