import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { authConfig } from "./config";

export const SESSION_COOKIE = "scout_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  /** Keycloak ID token, kept for RP-initiated logout. */
  idToken?: string;
};

async function sessionKey(): Promise<Uint8Array> {
  const material = new TextEncoder().encode(authConfig.sessionSecret);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return new Uint8Array(digest);
}

export async function sealSession(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${authConfig.sessionTtlSeconds}s`)
    .encrypt(await sessionKey());
}

export async function openSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, await sessionKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      idToken: typeof payload.idToken === "string" ? payload.idToken : undefined,
    };
  } catch {
    return null;
  }
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return openSession(raw);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: authConfig.appUrl.startsWith("https://"),
    path: "/",
    maxAge: authConfig.sessionTtlSeconds,
  };
}
