import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-8 h-20 w-auto" />
        <div className="panel p-6">
          <h1 className="font-heading text-2xl font-bold">Acesso ao painel</h1>
          <p className="mt-1 text-sm text-silver-dim">Área restrita à equipe DS Hidráulica.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
