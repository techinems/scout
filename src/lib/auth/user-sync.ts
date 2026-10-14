import "server-only";
import { db } from "@/lib/db";
import { authConfig } from "./config";

/**
 * Upsert the user record on login and apply the ADMIN_EMAILS bootstrap:
 * anyone whose email is listed gets the Administrator role if they don't
 * already hold it. Admins can hand out roles from then on.
 *
 * DEFAULT_ROLE is granted only when the account is first created — never on
 * later logins, so an admin who strips someone's roles isn't overridden.
 */
export async function syncUserFromLogin(input: { sub: string | null; email: string; name: string }) {
  const email = input.email.toLowerCase();
  const isNew = !(await db.user.findUnique({ where: { email }, select: { id: true } }));
  const user = await db.user.upsert({
    where: { email },
    update: { name: input.name, sub: input.sub ?? undefined, lastLoginAt: new Date() },
    create: { email, name: input.name, sub: input.sub, lastLoginAt: new Date() },
  });

  // Auto-link a roster entry with the same email so mission notifications
  // can reach this account.
  await db.personnel.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, userId: null },
    data: { userId: user.id },
  });

  if (authConfig.adminEmails.includes(email)) {
    const adminRole = await db.role.findUnique({ where: { name: "Administrator" } });
    if (adminRole) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
        update: {},
        create: { userId: user.id, roleId: adminRole.id },
      });
    }
  }

  if (isNew && authConfig.defaultRole) {
    const role = await db.role.findUnique({ where: { name: authConfig.defaultRole } });
    if (!role) {
      console.warn(`[auth] DEFAULT_ROLE "${authConfig.defaultRole}" does not match any role; skipping`);
    } else if ((await db.userRole.count({ where: { userId: user.id } })) === 0) {
      await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
    }
  }

  return user;
}
