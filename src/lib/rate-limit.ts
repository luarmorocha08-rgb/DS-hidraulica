import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Limite de requisições por janela fixa, armazenado no PostgreSQL
 * (funciona com várias instâncias/serverless).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs);
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count
  `);
  const count = Number(result.rows[0]?.count ?? 1);

  // limpeza ocasional de janelas antigas
  if (Math.random() < 0.02) {
    await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  }

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.ceil((windowStart.getTime() + windowMs - nowMs) / 1000),
  };
}
