/** Assinatura/verificação do token de sessão. Compatível com o runtime do Proxy. */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "ds_admin";
export const SESSION_HOURS = 12;

export interface SessionClaims {
  sub: string;
  role: "owner" | "admin" | "staff";
  sv: number;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curto (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT({ role: claims.role, sv: claims.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.sv !== "number") return null;
    return { sub: payload.sub, role: payload.role as SessionClaims["role"], sv: payload.sv };
  } catch {
    return null;
  }
}
