/**
 * Cria (ou redefine a senha de) um administrador.
 *   npm run admin:create -- --email voce@empresa.com --name "Seu Nome" --role owner
 * A senha é lida de ADMIN_PASSWORD ou solicitada no terminal.
 */
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { closeDb, db } from "../src/db";
import { admins } from "../src/db/schema";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";
import { sql } from "drizzle-orm";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "owner" },
    },
  });
  const email = (values.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (values.name ?? process.env.ADMIN_NAME ?? "Administrador").trim();
  const role = values.role as "owner" | "admin" | "staff";
  if (!email) throw new Error("Informe --email ou ADMIN_EMAIL.");
  if (!["owner", "admin", "staff"].includes(role)) throw new Error("Papel inválido.");

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Senha (mín. 10 caracteres, letras e números): ");
    rl.close();
  }
  const problem = passwordProblems(password);
  if (problem) throw new Error(problem);

  const passwordHash = await hashPassword(password);
  await db
    .insert(admins)
    .values({ email, name, role, passwordHash })
    .onConflictDoUpdate({
      target: admins.email,
      set: { passwordHash, role, name, active: true, sessionVersion: sql`${admins.sessionVersion} + 1` },
    });
  console.log(`Administrador ${email} (${role}) pronto.`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(closeDb);
