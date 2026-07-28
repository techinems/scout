import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { getOidcConfig } from "@/lib/auth/oidc";
import { readSessionCookie, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET() {
  const loginUrl = new URL("/login", authConfig.appUrl);

  if (authConfig.disabled) {
    // Nothing to log out of in dev-bypass mode; bounce home.
    return NextResponse.redirect(new URL("/", authConfig.appUrl));
  }

  const session = await readSessionCookie();
  let target = loginUrl.toString();

  // RP-initiated logout so the Keycloak SSO session ends too.
  if (session?.idToken) {
    try {
      const config = await getOidcConfig();
      const endSession = config.serverMetadata().end_session_endpoint;
      if (endSession) {
        const url = new URL(endSession);
        url.searchParams.set("id_token_hint", session.idToken);
        url.searchParams.set("post_logout_redirect_uri", loginUrl.toString());
        target = url.toString();
      }
    } catch (err) {
      console.error("Logout: could not resolve end_session_endpoint", err);
    }
  }

  const response = NextResponse.redirect(target);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
