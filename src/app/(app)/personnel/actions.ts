"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import type { ActionResult } from "@/app/(app)/facilities/actions";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  callsign: z.string().trim().default(""),
  title: z.string().trim().default(""),
  agency: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
});

export async function savePersonnel(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("personnel.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit personnel." };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, ...data } = parsed.data;

  // Link to a login account by email so notifications reach this person.
  const linkedUser = data.email
    ? await db.user.findFirst({ where: { email: { equals: data.email, mode: "insensitive" } } })
    : null;
  const record = { ...data, userId: linkedUser?.id ?? null };

  try {
    if (id) await db.personnel.update({ where: { id }, data: record });
    else await db.personnel.create({ data: record });
  } catch {
    return { ok: false, error: "That login account is already linked to another roster entry." };
  }

  revalidatePath("/personnel");
  return { ok: true };
}

export async function setPersonnelActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertPermission("personnel.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.personnel.update({ where: { id }, data: { isActive } });
  revalidatePath("/personnel");
  return { ok: true };
}

export async function deletePersonnel(id: string): Promise<ActionResult> {
  try {
    await assertPermission("personnel.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.personnel.delete({ where: { id } });
  revalidatePath("/personnel");
  return { ok: true };
}
