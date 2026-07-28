"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { isPermission } from "@/lib/rbac/permissions";
import type { ActionResult } from "@/app/(app)/facilities/actions";

// ─── Roles ──────────────────────────────────────────────────────────

const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Role name is required"),
  description: z.string().trim().default(""),
});

export async function saveRole(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("admin.roles");
  } catch {
    return { ok: false, error: "You don't have permission to manage roles." };
  }

  const parsed = roleSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const permissions = formData.getAll("permissions").map(String).filter(isPermission);
  const { id, name, description } = parsed.data;

  try {
    const role = id
      ? await db.role.update({ where: { id }, data: { name, description } })
      : await db.role.create({ data: { name, description } });

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await db.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permission: p })) });
    }
  } catch {
    return { ok: false, error: "A role with that name already exists." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  try {
    await assertPermission("admin.roles");
  } catch {
    return { ok: false, error: "No permission." };
  }
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false, error: "Role not found." };
  if (role.isSystem) return { ok: false, error: "System roles can't be deleted." };
  await db.role.delete({ where: { id: roleId } });
  revalidatePath("/admin");
  return { ok: true };
}

// ─── User role assignment ───────────────────────────────────────────

export async function setUserRoles(userId: string, roleIds: string[]): Promise<ActionResult> {
  let actor;
  try {
    actor = await assertPermission("admin.users");
  } catch {
    return { ok: false, error: "You don't have permission to manage users." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  // Guard: an admin can't remove their own Administrator role — prevents
  // locking everyone out of role management.
  if (actor.id === userId) {
    const adminRole = await db.role.findUnique({ where: { name: "Administrator" } });
    if (adminRole && !roleIds.includes(adminRole.id)) {
      return { ok: false, error: "You can't remove your own Administrator role." };
    }
  }

  await db.userRole.deleteMany({ where: { userId } });
  if (roleIds.length > 0) {
    const valid = await db.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } });
    await db.userRole.createMany({ data: valid.map((r) => ({ userId, roleId: r.id })) });
  }

  revalidatePath("/admin");
  return { ok: true };
}

// ─── Crew status types ──────────────────────────────────────────────

const statusTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  shortCode: z.string().trim().min(1, "Short code is required").max(10, "Keep the short code brief"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value"),
});

export async function saveStatusType(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("status.configure");
  } catch {
    return { ok: false, error: "You don't have permission to manage status types." };
  }

  const parsed = statusTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, name, shortCode, color } = parsed.data;

  try {
    if (id) {
      await db.crewStatusType.update({ where: { id }, data: { name, shortCode, color } });
    } else {
      const max = await db.crewStatusType.aggregate({ _max: { sortOrder: true } });
      await db.crewStatusType.create({
        data: { name, shortCode, color, sortOrder: (max._max.sortOrder ?? 0) + 1 },
      });
    }
  } catch {
    return { ok: false, error: "A status with that name already exists." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteStatusType(id: string): Promise<ActionResult> {
  try {
    await assertPermission("status.configure");
  } catch {
    return { ok: false, error: "No permission." };
  }
  const type = await db.crewStatusType.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!type) return { ok: false, error: "Status not found." };
  if (type._count.events > 0) {
    // History references it — retire instead of deleting.
    await db.crewStatusType.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.crewStatusType.delete({ where: { id } });
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function restoreStatusType(id: string): Promise<ActionResult> {
  try {
    await assertPermission("status.configure");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.crewStatusType.update({ where: { id }, data: { isActive: true } });
  revalidatePath("/admin");
  return { ok: true };
}
