import { asc } from "drizzle-orm";
import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { createAdminAction, updateAdminAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Usuários" };

const ROLES = [
  { value: "staff", label: "Equipe — agenda e solicitações" },
  { value: "admin", label: "Administrador — também conteúdo e regras" },
  { value: "owner", label: "Proprietário — também usuários" },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const me = await requireAdmin("owner");
  const sp = await searchParams;
  const rows = await db.select().from(admins).orderBy(asc(admins.name));
  return (
    <AdminPage title="Usuários do painel">
      <Flash msg={sp.msg} error={sp.error} />
      <Card title="Novo usuário">
        <form action={createAdminAction} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          <Field label="Nome"><input name="name" required className={inputCls} /></Field>
          <Field label="E-mail"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Senha inicial"><input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <Field label="Papel"><select name="role" className={inputCls}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>
          <SubmitButton>Criar</SubmitButton>
        </form>
      </Card>
      <div className="mt-6 space-y-3">
        {rows.map((a) => (
          <form key={a.id} action={updateAdminAction} className="grid gap-3 rounded-[12px] border border-white/[0.08] bg-ink-2 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto_auto] md:items-end">
            <input type="hidden" name="id" value={a.id} />
            <div>
              <p className="font-semibold">{a.name} {a.id === me.id && <span className="text-xs text-orange">(você)</span>}</p>
              <p className="text-xs text-silver-dim">{a.email} · último acesso {a.lastLoginAt ? formatDateTime(a.lastLoginAt, "America/Sao_Paulo") : "nunca"}</p>
            </div>
            <Field label="Papel"><select name="role" defaultValue={a.role} className={inputCls}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label.split(" —")[0]}</option>)}</select></Field>
            <Field label="Nova senha (opcional)"><input name="password" type="password" autoComplete="new-password" className={inputCls} /></Field>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={a.active} className="accent-[#f47712]" /> Ativo</label>
            <SubmitButton variant="secondary">Salvar</SubmitButton>
          </form>
        ))}
      </div>
      <p className="mt-4 text-xs text-silver-dim">Alterar papel, senha ou desativar encerra as sessões abertas do usuário.</p>
    </AdminPage>
  );
}
