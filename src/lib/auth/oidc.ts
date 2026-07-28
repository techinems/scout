import "server-only";
import * as oidc from "openid-client";
import { authConfig } from "./config";

let cached: Promise<oidc.Configuration> | null = null;

/** Discover the Keycloak OP configuration (cached for the process lifetime). */
export function getOidcConfig(): Promise<oidc.Configuration> {
  if (!authConfig.issuer) {
    throw new Error("KEYCLOAK_ISSUER is not set — cannot use OIDC login (or set AUTH_DISABLED=true for local dev)");
  }
  cached ??= oidc.discovery(
    new URL(authConfig.issuer),
    authConfig.clientId,
    authConfig.clientSecret || undefined,
  );
  return cached;
}

export function redirectUri(): string {
  return new URL("/api/auth/callback", authConfig.appUrl).toString();
}

/** Extract Keycloak realm roles from an access token without verifying it —
 *  it was just received directly from the token endpoint over TLS. */
export function realmRolesFromAccessToken(accessToken: string): string[] {
  try {
    const [, payload] = accessToken.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const roles = decoded?.realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}
