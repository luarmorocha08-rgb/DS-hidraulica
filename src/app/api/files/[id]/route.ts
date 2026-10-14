import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Anexos de clientes — somente para a equipe autenticada. */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/files/[id]">) {
  if (!(await getSession())) return new NextResponse("Não autorizado", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Não encontrado", { status: 404 });
  const [file] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!file) return new NextResponse("Não encontrado", { status: 404 });
  const data = await storage().get(file.storageKey).catch(() => null);
  if (!data) return new NextResponse("Arquivo indisponível", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
