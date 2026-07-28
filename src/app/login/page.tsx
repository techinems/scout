import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth/config";
import { readSessionCookie } from "@/lib/auth/session";
import { LogoMark } from "@/components/logo";
import { appConfig } from "@/lib/app-config";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  expired: "Sign-in attempt expired. Try again.",
  forbidden: "Your account doesn't have access to Scout. Contact the team administrator.",
  oidc: "Sign-in failed. Try again or contact the administrator.",
  claims: "The identity provider returned an unusable response.",
  noemail: "Your account has no email address configured.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (authConfig.disabled || (await readSessionCookie())) redirect("/");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.oidc) : null;

  return (
    <div className="grid-ground flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <LogoMark className="size-14 text-ink-muted" />
          <h1 className="mt-5 text-2xl font-bold tracking-[0.28em] uppercase">{appConfig.appName}</h1>
          <p className="kicker mt-2">{appConfig.unitLine}</p>
        </div>

        <div className="rounded-(--radius-card) border border-edge bg-surface p-6">
          <p className="text-sm text-ink-muted">{appConfig.loginNotice}</p>

          {message && (
            <p className="mt-4 rounded-(--radius-control) border border-danger/40 bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {message}
            </p>
          )}

          <a
            href="/api/auth/login"
            className="mt-5 flex h-10 w-full items-center justify-center rounded-(--radius-control) bg-accent text-sm font-semibold text-[#1a0d08] transition-colors hover:bg-accent-bright"
          >
            Sign in with SSO
          </a>
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-faint">{appConfig.footerNotice}</p>
      </div>
    </div>
  );
}
