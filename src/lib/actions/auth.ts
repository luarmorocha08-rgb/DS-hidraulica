"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { endSession, getSession, startSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

// hash fixo para equalizar o tempo de resposta quando o e-mail não existe
const DUMMY_HASH = "$2b$12$LNUdxM1nENyWIso8k9grn.LXVAlx3D3Vbb05iUjiXH1jUuMEKFNpm";

export async function loginAction(_prev: { error?: string; email?: string } | undefined, fd: FormData): Promise<{ error?: string; email?: string }> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().max(160), password: z.string().min(1).max(200), next: z.string().optional() })
    .safeParse({ email: fd.get("email"), password: fd.get("password"), next: fd.get("next") ?? undefined });
  if (!parsed.success) return { error: "Informe e-mail e senha." };

  const ip = await clientIp();
  const byIp = await rateLimit(`login-ip:${ip}`, 20, 900);
  const byEmail = await rateLimit(`login-email:${parsed.data.email}`, 8, 900);
  const email = parsed.data.email;
  if (!byIp.ok || !byEmail.ok) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente.", email };

  const [admin] = await db.select().from(admins).where(eq(admins.email, parsed.data.email)).limit(1);
  const ok = await verifyPassword(parsed.data.password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok || !admin.active) {
    if (admin) await audit(admin.id, "login_failed", "admin", admin.id);
    return { error: "E-mail ou senha incorretos.", email };
  }
  await startSession(admin);
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
  await audit(admin.id, "login", "admin", admin.id);
  const next = parsed.data.next && /^\/admin(\/[\w\-/]*)?$/.test(parsed.data.next) ? parsed.data.next : "/admin";
  redirect(next);
}

export async function logoutAction() {
  const s = await getSession();
  if (s) await audit(s.id, "logout", "admin", s.id);
  await endSession();
  redirect("/admin/login");
}
