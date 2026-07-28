import "server-only";
import { db } from "@/lib/db";
import { authConfig } from "./config";

/**
 * Upsert the user record on login and apply the ADMIN_EMAILS bootstrap:
 * anyone whose email is listed gets the Administrator role if they don't
 * already hold it. Admins can hand out roles from then on.
 */
export async function syncUserFromLogin(input: { sub: string | null; email: string; name: string }) {
  const email = input.email.toLowerCase();
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

  return user;
}
