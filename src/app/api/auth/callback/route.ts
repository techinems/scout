import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { authConfig } from "@/lib/auth/config";
import { getOidcConfig, realmRolesFromAccessToken, redirectUri } from "@/lib/auth/oidc";
import { SESSION_COOKIE, sealSession, sessionCookieOptions } from "@/lib/auth/session";
import { syncUserFromLogin } from "@/lib/auth/user-sync";

export async function GET(request: NextRequest) {
  if (authConfig.disabled) {
    return NextResponse.redirect(new URL("/", authConfig.appUrl));
  }

  const jar = await cookies();
  const codeVerifier = jar.get("scout_pkce")?.value;
  const expectedState = jar.get("scout_state")?.value;
  jar.delete("scout_pkce");
  jar.delete("scout_state");

  if (!codeVerifier || !expectedState) {
    return NextResponse.redirect(new URL("/login?error=expired", authConfig.appUrl));
  }

  try {
    const config = await getOidcConfig();
    // Reconstruct the callback URL on our canonical origin — behind a proxy
    // request.url may carry an internal host.
    const currentUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, redirectUri());
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
    });

    const claims = tokens.claims();
    if (!claims?.sub) {
      return NextResponse.redirect(new URL("/login?error=claims", authConfig.appUrl));
    }

    const roles = realmRolesFromAccessToken(tokens.access_token);
    if (!roles.includes(authConfig.requiredRole)) {
      return NextResponse.redirect(new URL("/login?error=forbidden", authConfig.appUrl));
    }

    const email = typeof claims.email === "string" ? claims.email : "";
    const name =
      typeof claims.name === "string"
        ? claims.name
        : typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : email;
    if (!email) {
      return NextResponse.redirect(new URL("/login?error=noemail", authConfig.appUrl));
    }

    await syncUserFromLogin({ sub: claims.sub, email, name });

    const sealed = await sealSession({
      sub: claims.sub,
      email,
      name,
      idToken: tokens.id_token,
    });

    const response = NextResponse.redirect(new URL("/", authConfig.appUrl));
    response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
    return response;
  } catch (err) {
    console.error("OIDC callback failed:", err);
    return NextResponse.redirect(new URL("/login?error=oidc", authConfig.appUrl));
  }
}
