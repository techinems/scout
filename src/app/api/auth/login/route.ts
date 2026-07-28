import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { authConfig } from "@/lib/auth/config";
import { getOidcConfig, redirectUri } from "@/lib/auth/oidc";

export async function GET() {
  if (authConfig.disabled) {
    return NextResponse.redirect(new URL("/", authConfig.appUrl));
  }

  const config = await getOidcConfig();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();

  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  const jar = await cookies();
  const secure = authConfig.appUrl.startsWith("https://");
  const opts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 600 };
  jar.set("scout_pkce", codeVerifier, opts);
  jar.set("scout_state", state, opts);

  return NextResponse.redirect(url);
}
