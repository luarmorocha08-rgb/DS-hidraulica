import { randomInt } from "node:crypto";
import type { RequestKind } from "@/db/schema";

// Base32 de Crockford sem caracteres ambíguos (I, L, O, U).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX: Record<RequestKind, string> = { appointment: "AG", visit: "VT", quote: "OR" };

export function generateProtocol(kind: RequestKind): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `DS-${PREFIX[kind]}-${code}`;
}

export function protocolKind(protocol: string): RequestKind | null {
  const m = /^DS-(AG|VT|OR)-[0-9A-Z]{6}$/.exec(protocol.trim().toUpperCase());
  if (!m) return null;
  return m[1] === "AG" ? "appointment" : m[1] === "VT" ? "visit" : "quote";
}

export function normalizeProtocol(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}
