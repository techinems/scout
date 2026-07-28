import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function DeniedPage() {
  return (
    <div className="grid-ground flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-12 text-ink-faint" />
      <h1 className="mt-6 text-lg font-bold tracking-widest uppercase">Not authorized</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Your account doesn&apos;t hold the permission required for that page. If you believe you
        should have it, ask a team administrator to update your role.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-(--radius-control) border border-edge-strong px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
      >
        Back to overview
      </Link>
    </div>
  );
}
