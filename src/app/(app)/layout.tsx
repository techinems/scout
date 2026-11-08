import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNavProvider, MobileTopBar, SidebarDrawer } from "@/components/shell/mobile-nav";
import { Wordmark } from "@/components/logo";

// Every page behind auth renders per-request — never at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <MobileNavProvider>
      <div className="flex h-dvh overflow-hidden">
        <SidebarDrawer>
          <Sidebar user={user} />
        </SidebarDrawer>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar>
            <Link href="/" className="block scale-90 origin-left">
              <Wordmark />
            </Link>
          </MobileTopBar>
          <main className="relative flex-1 overflow-y-auto">
            <div className="grid-ground pointer-events-none absolute inset-0" />
            <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
