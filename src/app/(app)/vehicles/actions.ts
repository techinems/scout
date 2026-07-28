"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import type { ActionResult } from "@/app/(app)/facilities/actions";

const schema = z.object({
  id: z.string().optional(),
  designator: z.string().trim().min(1, "Designator is required"),
  type: z.string().trim().default(""),
  plate: z.string().trim().default(""),
  notes: z.string().trim().default(""),
});

export async function saveVehicle(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("vehicle.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit vehicles." };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, ...data } = parsed.data;

  try {
    if (id) await db.vehicle.update({ where: { id }, data });
    else await db.vehicle.create({ data });
  } catch {
    return { ok: false, error: "A vehicle with that designator already exists." };
  }

  revalidatePath("/vehicles");
  return { ok: true };
}

export async function setVehicleActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertPermission("vehicle.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.vehicle.update({ where: { id }, data: { isActive } });
  revalidatePath("/vehicles");
  return { ok: true };
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    await assertPermission("vehicle.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.vehicle.delete({ where: { id } });
  revalidatePath("/vehicles");
  return { ok: true };
}
