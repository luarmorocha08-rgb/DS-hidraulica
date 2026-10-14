import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { formatDateShort } from "@/lib/time";

export const metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("staff");
  const { q } = await searchParams;
  const term = q?.trim();
  const digits = term?.replace(/\D/g, "");
  const rows = await db
    .select({
      c: customers,
      requests: sql<number>`(select count(*) from appointments a where a.customer_id = ${customers.id}) + (select count(*) from visit_requests v where v.customer_id = ${customers.id}) + (select count(*) from quote_requests r where r.customer_id = ${customers.id})`,
    })
    .from(customers)
    .where(term ? or(ilike(customers.name, `%${term}%`), digits ? ilike(customers.phone, `%${digits}%`) : undefined, ilike(customers.email, `%${term}%`)) : undefined)
    .orderBy(desc(customers.updatedAt))
    .limit(200);
  return (
    <AdminPage title="Clientes">
      <form className="mb-5"><input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou e-mail" className="field !min-h-10 max-w-md text-sm" /></form>
      <Table head={["Nome", "Telefone", "E-mail", "Solicitações", "Último contato"]} empty={!rows.length}>
        {rows.map(({ c, requests }) => (
          <tr key={c.id} className="hover:bg-white/[0.02]">
            <Td><Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:text-orange">{c.name}</Link></Td>
            <Td>{c.phone.startsWith("removido") ? "—" : formatPhone(c.phone)}</Td>
            <Td>{c.email ?? "—"}</Td>
            <Td>{Number(requests)}</Td>
            <Td>{formatDateShort(c.updatedAt, "America/Sao_Paulo")}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
