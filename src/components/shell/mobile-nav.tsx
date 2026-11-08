"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconClose, IconMenu } from "@/components/icons";

/**
 * Below the md breakpoint the sidebar becomes an off-canvas drawer opened
 * from a hamburger in a top bar. At md and up it's the usual static column.
 */
const NavContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Remember which path the drawer was opened on: navigating anywhere else
  // closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = useCallback((next: boolean) => setOpenedOn(next ? pathname : null), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return <NavContext.Provider value={{ open, setOpen }}>{children}</NavContext.Provider>;
}

export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useContext(NavContext);
  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        id="app-sidebar"
        // Tapping a nav link closes the drawer even when it's the current page.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none",
          open ? "translate-x-0 shadow-2xl shadow-black/60" : "-translate-x-full",
        )}
      >
        {children}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className={cn(
            "absolute top-4 -right-11 flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink-muted md:hidden",
            !open && "hidden",
          )}
        >
          <IconClose />
        </button>
      </div>
    </>
  );
}

export function MobileTopBar({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useContext(NavContext);
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-surface px-3 md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="app-sidebar"
        className="flex size-9 items-center justify-center rounded-(--radius-control) text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        <IconMenu className="size-5" />
      </button>
      {children}
    </div>
  );
}
