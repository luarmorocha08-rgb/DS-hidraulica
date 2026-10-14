import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __dsPool?: Pool; __dsDb?: Database };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Copie .env.example para .env e informe a conexão PostgreSQL.",
    );
  }
  const needsSsl = /sslmode=require/.test(url) || /neon\.tech|supabase\.co/.test(url);
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

/** Conexão preguiçosa: o build do Next não precisa de banco. */
export function getDb(): Database {
  if (!globalForDb.__dsDb) {
    globalForDb.__dsPool = createPool();
    globalForDb.__dsDb = drizzle(globalForDb.__dsPool, { schema });
  }
  return globalForDb.__dsDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});

export async function closeDb() {
  await globalForDb.__dsPool?.end();
  globalForDb.__dsPool = undefined;
  globalForDb.__dsDb = undefined;
}

export { schema };
