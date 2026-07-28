import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Permission } from "@/lib/rbac/permissions";
import { authConfig } from "./config";
import { readSessionCookie } from "./session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: Set<Permission>;
};

async function loadUser(email: string): Promise<CurrentUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { roles: { include: { role: { include: { permissions: true } } } } },
  });
  if (!user) return null;
  const permissions = new Set<Permission>();
  const roles: string[] = [];
  for (const ur of user.roles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.permissions) permissions.add(rp.permission as Permission);
  }
  return { id: user.id, email: user.email, name: user.name, roles, permissions };
}

/** Ensure the synthetic dev user exists and holds Administrator. */
async function ensureDevUser(): Promise<CurrentUser> {
  const { email, name } = authConfig.devUser;
  let user = await loadUser(email);
  if (user && user.roles.includes("Administrator")) return user;

  let record;
  try {
    record = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, lastLoginAt: new Date() },
    });
  } catch {
    // Concurrent first-render requests can race the upsert; the row exists now.
    record = await db.user.findUniqueOrThrow({ where: { email } });
  }
  const adminRole = await db.role.findUnique({ where: { name: "Administrator" } });
  if (adminRole) {
    await db.userRole.upsert({
      where: { userId_roleId: { userId: record.id, roleId: adminRole.id } },
      update: {},
      create: { userId: record.id, roleId: adminRole.id },
    });
  }
  user = await loadUser(email);
  if (!user) throw new Error("Failed to provision dev user");
  return user;
}

/** Resolve the signed-in user with permissions, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (authConfig.disabled) return ensureDevUser();
  const session = await readSessionCookie();
  if (!session) return null;
  return loadUser(session.email);
});

/** For pages: redirect to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: additionally require a permission, else show the denied page. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.has(permission)) redirect("/denied");
  return user;
}

/** For server actions / API routes: throw instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!user.permissions.has(permission)) throw new Error(`Missing permission: ${permission}`);
  return user;
}
