"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-(--radius-control) px-2 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent-soft text-accent-bright"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <span className={cn("transition-colors", active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted")}>
        {icon}
      </span>
      {label}
      {active && <span className="ml-auto size-1 rounded-full bg-accent" />}
    </Link>
  );
}
