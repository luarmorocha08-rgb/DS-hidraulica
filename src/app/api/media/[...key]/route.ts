import { NextResponse, type NextRequest } from "next/server";
import { storage } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", mp4: "video/mp4", mov: "video/quicktime" };

/** Imagens públicas do site enviadas pelo painel (prefixo public/). */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/media/[...key]">) {
  const { key } = await params;
  const path = key.join("/");
  if (!path.startsWith("public/") || path.includes("..")) return new NextResponse("Não encontrado", { status: 404 });
  const data = await storage().get(path).catch(() => null);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  const ext = path.split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
