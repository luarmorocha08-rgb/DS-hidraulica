import { NextResponse, type NextRequest } from "next/server";
import { getBookingType, getDayAvailability, getMonthAvailability } from "@/lib/schedule";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/disponibilidade?tipo=<uuid>&mes=YYYY-MM  → situação de cada dia
 * GET /api/disponibilidade?tipo=<uuid>&data=YYYY-MM-DD → horários do dia
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const rl = await rateLimit(`disp:${ip}`, 240, 600);
  if (!rl.ok) return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429 });

  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(tipo)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  const type = await getBookingType(tipo);
  if (!type) return NextResponse.json({ error: "Tipo de atendimento indisponível." }, { status: 404 });

  const headers = { "Cache-Control": "no-store" };
  const mes = sp.get("mes");
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json(await getMonthAvailability(mes, type.durationMinutes), { headers });
  }
  const data = sp.get("data");
  if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json(await getDayAvailability(data, type.durationMinutes), { headers });
  }
  return NextResponse.json({ error: "Informe mes=YYYY-MM ou data=YYYY-MM-DD." }, { status: 400 });
}
