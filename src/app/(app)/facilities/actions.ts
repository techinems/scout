"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { formatPhone } from "@/lib/phone";
import { resolveLocation } from "@/lib/google/geocode";

export type ActionResult = { ok: true } | { ok: false; error: string };

const facilitySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  address: z.string().trim().min(1, "Address is required"),
  phone: z.string().trim().default("").transform(formatPhone),
  traumaLevel: z.string().trim().default(""),
  hasHelipad: z.coerce.boolean().default(false),
  notes: z.string().trim().default(""),
  manualLat: z.string().optional(),
  manualLng: z.string().optional(),
});

export async function saveFacility(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("facility.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit facilities." };
  }

  const parsed = facilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const category = await db.facilityCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) return { ok: false, error: "Unknown category." };

  // Skip re-geocoding on edit when the address hasn't changed.
  const existing = data.id ? await db.facility.findUnique({ where: { id: data.id } }) : null;
  let lat: number, lng: number, address: string;
  if (existing && existing.address === data.address && !data.manualLat && !data.manualLng) {
    ({ lat, lng, address } = existing);
  } else {
    const loc = await resolveLocation(data);
    if (!loc.ok) return loc;
    ({ lat, lng, address } = loc);
  }

  const record = {
    name: data.name,
    categoryId: data.categoryId,
    address,
    lat,
    lng,
    phone: data.phone,
    traumaLevel: data.traumaLevel,
    hasHelipad: data.hasHelipad,
    notes: data.notes,
  };

  if (existing) {
    await db.facility.update({ where: { id: existing.id }, data: record });
  } else {
    await db.facility.create({ data: record });
  }

  revalidatePath("/facilities");
  return { ok: true };
}

export async function setFacilityActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertPermission("facility.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.facility.update({ where: { id }, data: { isActive } });
  revalidatePath("/facilities");
  return { ok: true };
}

export async function deleteFacility(id: string): Promise<ActionResult> {
  try {
    await assertPermission("facility.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.facility.delete({ where: { id } });
  revalidatePath("/facilities");
  return { ok: true };
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  noteLabel: z.string().trim().min(1, "Note label is required").max(12, "Keep the note label short"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value"),
  isAeromedical: z.coerce.boolean().default(false),
});

export async function saveCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("facility.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit categories." };
  }

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, name, noteLabel, color, isAeromedical } = parsed.data;

  if (id) {
    await db.facilityCategory.update({ where: { id }, data: { name, noteLabel, color, isAeromedical } });
  } else {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const max = await db.facilityCategory.aggregate({ _max: { sortOrder: true } });
    await db.facilityCategory.create({
      data: { name, slug, noteLabel, color, isAeromedical, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  }

  revalidatePath("/facilities");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await assertPermission("facility.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  const category = await db.facilityCategory.findUnique({
    where: { id },
    include: { _count: { select: { facilities: true } } },
  });
  if (!category) return { ok: false, error: "Category not found." };
  if (category.isSystem) return { ok: false, error: "Built-in categories can't be deleted." };
  if (category._count.facilities > 0) {
    return { ok: false, error: "Move or delete its facilities first." };
  }
  await db.facilityCategory.delete({ where: { id } });
  revalidatePath("/facilities");
  return { ok: true };
}
