import Link from "next/link";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { Permission } from "@/lib/rbac/permissions";
import { Wordmark } from "@/components/logo";
import {
  IconCross,
  IconCrosshair,
  IconExit,
  IconGrid,
  IconShield,
  IconTruck,
  IconUsers,
} from "@/components/icons";
import { NavLink } from "./nav-link";
import { PushToggle } from "./push-toggle";
import { authConfig } from "@/lib/auth/config";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  needs: Permission | null;
};

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: <IconGrid />, needs: null },
  { href: "/missions", label: "Missions", icon: <IconCrosshair />, needs: "mission.view" },
  { href: "/facilities", label: "Facilities", icon: <IconCross />, needs: "facility.view" },
  { href: "/personnel", label: "Personnel", icon: <IconUsers />, needs: "personnel.view" },
  { href: "/vehicles", label: "Vehicles", icon: <IconTruck />, needs: "vehicle.view" },
];

export function Sidebar({ user }: { user: CurrentUser }) {
  const items = NAV.filter((i) => !i.needs || user.permissions.has(i.needs));
  const showAdmin = user.permissions.has("admin.roles") || user.permissions.has("admin.users");
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-edge bg-surface">
      <div className="px-4 pt-5 pb-4 border-b border-edge">
        <Link href="/" className="block">
          <Wordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="kicker px-2 pb-2">Operations</p>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} icon={item.icon} label={item.label} />
            </li>
          ))}
        </ul>

        {showAdmin && (
          <>
            <p className="kicker px-2 pb-2 pt-5">System</p>
            <ul className="space-y-0.5">
              <li>
                <NavLink href="/admin" icon={<IconShield />} label="Administration" />
              </li>
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-edge p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-[11px] font-bold text-ink-muted">
            {initials}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-[11px] text-ink-faint">
              {user.roles.join(", ") || "No role assigned"}
            </span>
          </span>
          <PushToggle vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
          {!authConfig.disabled && (
            <a
              href="/api/auth/logout"
              title="Sign out"
              className="text-ink-faint transition-colors hover:text-danger"
            >
              <IconExit />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
