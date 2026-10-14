"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert, TextField } from "@/components/ui/Field";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField key={state?.email} name="email" label="E-mail" type="email" autoComplete="username" defaultValue={state?.email} />
      <TextField name="password" label="Senha" type="password" autoComplete="current-password" />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
