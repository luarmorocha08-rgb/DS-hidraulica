import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { changeOwnPasswordAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const me = await requireAdmin("staff");
  const sp = await searchParams;
  return (
    <AdminPage title="Minha conta" description={`${me.name} · ${me.email}`}>
      <Flash msg={sp.msg} error={sp.error} />
      <Card title="Alterar senha" className="max-w-lg">
        <form action={changeOwnPasswordAction} className="space-y-3">
          <Field label="Senha atual"><input type="password" name="current" required autoComplete="current-password" className={inputCls} /></Field>
          <Field label="Nova senha (mín. 10, letras e números)"><input type="password" name="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <Field label="Confirmar nova senha"><input type="password" name="confirm" required autoComplete="new-password" className={inputCls} /></Field>
          <SubmitButton>Alterar senha</SubmitButton>
          <p className="text-xs text-silver-dim">Depois de alterar, entre novamente.</p>
        </form>
      </Card>
    </AdminPage>
  );
}
