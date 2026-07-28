import { requireUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/shell/sidebar";

// Every page behind auth renders per-request — never at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar user={user} />
      <main className="relative flex-1 overflow-y-auto">
        <div className="grid-ground pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
