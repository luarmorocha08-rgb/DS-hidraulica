import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, type Admin, type AdminRole } from "@/db/schema";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from "./token";

export type SessionAdmin = Pick<Admin, "id" | "name" | "email" | "role">;

const ROLE_RANK: Record<AdminRole, number> = { staff: 1, admin: 2, owner: 3 };

export function hasRole(admin: { role: AdminRole }, minimum: AdminRole) {
  return ROLE_RANK[admin.role] >= ROLE_RANK[minimum];
}

export async function startSession(admin: Admin) {
  const token = await signSession({ sub: admin.id, role: admin.role, sv: admin.sessionVersion });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Sessão validada no banco (conta ativa e versão de sessão atual). */
export const getSession = cache(async (): Promise<SessionAdmin | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const [admin] = await db.select().from(admins).where(eq(admins.id, claims.sub)).limit(1);
  if (!admin || !admin.active || admin.sessionVersion !== claims.sv) return null;
  return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
});

export async function requireAdmin(minimum: AdminRole = "staff"): Promise<SessionAdmin> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!hasRole(session, minimum)) redirect("/admin?acesso=negado");
  return session;
}
