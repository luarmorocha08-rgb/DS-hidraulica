import { and, count, eq, inArray } from "drizzle-orm";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { AdminNav, type NavItem } from "@/components/admin/client";
import { Logo } from "@/components/brand/Logo";
import { db } from "@/db";
import { appointments, quoteRequests, visitRequests } from "@/db/schema";
import { logoutAction } from "@/lib/actions/auth";
import { hasRole, requireAdmin } from "@/lib/auth/session";

const ROLE_LABEL = { owner: "Proprietário", admin: "Administrador", staff: "Equipe" };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin("staff");
  const [[ap], [vi], [qu]] = await Promise.all([
    db.select({ n: count() }).from(appointments).where(eq(appointments.status, "pending")),
    db.select({ n: count() }).from(visitRequests).where(inArray(visitRequests.status, ["received", "in_review"])),
    db.select({ n: count() }).from(quoteRequests).where(and(inArray(quoteRequests.status, ["new"]))),
  ]);

  const items: NavItem[] = [
    { href: "/admin", label: "Painel" },
    { href: "/admin/agenda", label: "Agenda", group: "Atendimento" },
    { href: "/admin/agendamentos", label: "Agendamentos", group: "Atendimento", badge: ap.n },
    { href: "/admin/visitas", label: "Visitas ao local", group: "Atendimento", badge: vi.n },
    { href: "/admin/orcamentos", label: "Orçamentos", group: "Atendimento", badge: qu.n },
    { href: "/admin/clientes", label: "Clientes", group: "Atendimento" },
    { href: "/admin/agenda/bloqueios", label: "Feriados e bloqueios", group: "Agenda" },
  ];
  if (hasRole(admin, "admin")) {
    items.push(
      { href: "/admin/configuracoes", label: "Horários e regras", group: "Agenda" },
      { href: "/admin/conteudo/empresa", label: "Dados da empresa", group: "Site" },
      { href: "/admin/conteudo/servicos", label: "Serviços", group: "Site" },
      { href: "/admin/conteudo/galeria", label: "Galeria", group: "Site" },
      { href: "/admin/conteudo/depoimentos", label: "Depoimentos", group: "Site" },
      { href: "/admin/conteudo/trajetoria", label: "Trajetória", group: "Site" },
      { href: "/admin/auditoria", label: "Auditoria e envios", group: "Sistema" },
    );
  }
  if (hasRole(admin, "owner")) items.push({ href: "/admin/usuarios", label: "Usuários", group: "Sistema" });
  items.push({ href: "/admin/conta", label: "Minha conta", group: "Sistema" });

  return (
    <div className="lg:pl-64">
      <AdminNav
        items={items}
        footer={
          <div className="border-t border-white/[0.06] pt-4">
            <Link href="/" target="_blank" className="mb-3 block">
              <Logo className="h-10 w-auto" />
            </Link>
            <p className="text-sm font-semibold">{admin.name}</p>
            <p className="text-xs text-silver-dim">{ROLE_LABEL[admin.role]}</p>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="inline-flex items-center gap-2 text-sm text-silver hover:text-orange">
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
        }
      />
      <main>{children}</main>
    </div>
  );
}
