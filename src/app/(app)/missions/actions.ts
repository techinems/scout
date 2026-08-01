"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { resolveLocation } from "@/lib/google/geocode";
import { parseEtLocal, toDDM } from "@/lib/format";
import type { ActionResult } from "@/app/(app)/facilities/actions";

const STATUSES = ["DRAFT", "PLANNED", "ACTIVE", "COMPLETE", "CANCELLED"] as const;

function parseGoTime(raw: FormDataEntryValue | null): Date | null | { error: string } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const parsed = parseEtLocal(value);
  return parsed ?? { error: "Go-time is not a valid date/time." };
}

// ─── Mission basics ─────────────────────────────────────────────────

export async function createMission(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let userId: string;
  try {
    userId = (await assertPermission("mission.edit")).id;
  } catch {
    return { ok: false, error: "You don't have permission to create missions." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Mission name is required." };
  const goTime = parseGoTime(formData.get("goTime"));
  if (goTime && "error" in goTime) return { ok: false, error: goTime.error };

  const mission = await db.mission.create({
    data: { name, goTime, createdById: userId, briefing: String(formData.get("briefing") ?? "").trim() },
  });

  revalidatePath("/missions");
  redirect(`/missions/${mission.id}`);
}

const basicsSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Mission name is required"),
  status: z.enum(STATUSES),
  goTime: z.string().optional(),
  briefing: z.string().trim().default(""),
  comms: z.string().trim().default(""),
});

export async function updateMissionBasics(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit missions." };
  }

  const parsed = basicsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const goTime = parseGoTime(parsed.data.goTime ?? null);
  if (goTime && "error" in goTime) return { ok: false, error: goTime.error };

  await db.mission.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      status: parsed.data.status,
      goTime,
      briefing: parsed.data.briefing,
      comms: parsed.data.comms,
    },
  });

  revalidatePath(`/missions/${parsed.data.id}`);
  revalidatePath("/missions");
  return { ok: true };
}

export async function setMissionStatus(missionId: string, status: (typeof STATUSES)[number]): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };
  await db.mission.update({ where: { id: missionId }, data: { status } });
  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  return { ok: true };
}

export async function deleteMission(missionId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.mission.delete({ where: { id: missionId } });
  revalidatePath("/missions");
  redirect("/missions");
}

// ─── Local EMS ──────────────────────────────────────────────────────

const localEmsSchema = z.object({
  missionId: z.string().min(1),
  localEmsName: z.string().trim().default(""),
  localEmsDispatchPhone: z.string().trim().default(""),
  localEmsPocName: z.string().trim().default(""),
  localEmsPocPhone: z.string().trim().default(""),
  stagingAddress: z.string().trim().default(""),
  manualLat: z.string().optional(),
  manualLng: z.string().optional(),
});

export async function saveLocalEms(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit missions." };
  }

  const parsed = localEmsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const mission = await db.mission.findUnique({ where: { id: data.missionId } });
  if (!mission) return { ok: false, error: "Mission not found." };

  // Resolve staging coordinates only when the address changed or manual
  // coords were supplied; clearing the address clears the coordinates.
  let stagingLat: number | null = mission.localEmsStagingLat;
  let stagingLng: number | null = mission.localEmsStagingLng;
  let stagingAddress = data.stagingAddress;
  const hasManual = Boolean(data.manualLat?.trim() && data.manualLng?.trim());
  if (!stagingAddress && !hasManual) {
    stagingLat = null;
    stagingLng = null;
  } else if (stagingAddress !== mission.localEmsStagingAddress || hasManual) {
    const loc = await resolveLocation({ address: stagingAddress, manualLat: data.manualLat, manualLng: data.manualLng });
    if (!loc.ok) return loc;
    stagingLat = loc.lat;
    stagingLng = loc.lng;
    stagingAddress = loc.address || stagingAddress || toDDM(loc.lat, loc.lng);
  }

  await db.mission.update({
    where: { id: data.missionId },
    data: {
      localEmsName: data.localEmsName,
      localEmsDispatchPhone: data.localEmsDispatchPhone,
      localEmsPocName: data.localEmsPocName,
      localEmsPocPhone: data.localEmsPocPhone,
      localEmsStagingAddress: stagingAddress,
      localEmsStagingLat: stagingLat,
      localEmsStagingLng: stagingLng,
    },
  });

  revalidatePath(`/missions/${data.missionId}`);
  return { ok: true };
}

// ─── Locations ──────────────────────────────────────────────────────

const KINDS_WITH_LZ = ["MEET", "BRIEF", "STAGING", "TARGET", "LZ", "OTHER"] as const;

const locationSchema = z.object({
  id: z.string().optional(),
  missionId: z.string().min(1),
  kind: z.enum(KINDS_WITH_LZ),
  label: z.string().trim().default(""),
  address: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  manualLat: z.string().optional(),
  manualLng: z.string().optional(),
});

export async function saveLocation(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit missions." };
  }

  const parsed = locationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const hasCoords = Boolean(data.manualLat?.trim() && data.manualLng?.trim());
  if (!data.address && !hasCoords) {
    return {
      ok: false,
      error: data.kind === "LZ" ? "Pick the LZ on the map or enter coordinates." : "Address is required.",
    };
  }

  const existing = data.id ? await db.missionLocation.findUnique({ where: { id: data.id } }) : null;
  let lat: number, lng: number, address: string;
  if (existing && data.address && existing.address === data.address && !hasCoords) {
    ({ lat, lng, address } = existing);
  } else {
    const loc = await resolveLocation(data);
    if (!loc.ok) return loc;
    ({ lat, lng, address } = loc);
  }
  // An LZ picked straight off the map may have no text description — the
  // DDM coordinates become the address.
  if (!address) address = toDDM(lat, lng);

  const record = { kind: data.kind, label: data.label, address, lat, lng, notes: data.notes };
  if (existing) {
    await db.missionLocation.update({ where: { id: existing.id }, data: record });
  } else {
    await db.missionLocation.create({ data: { ...record, missionId: data.missionId } });
  }

  revalidatePath(`/missions/${data.missionId}`);
  return { ok: true };
}

export async function deleteLocation(missionId: string, locationId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.missionLocation.delete({ where: { id: locationId } });
  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

// ─── Crews ──────────────────────────────────────────────────────────

const crewSchema = z.object({
  id: z.string().optional(),
  missionId: z.string().min(1),
  name: z.string().trim().min(1, "Crew name is required"),
  vehicleId: z.string().optional(),
  notes: z.string().trim().default(""),
});

export async function saveCrew(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit missions." };
  }

  const parsed = crewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { id, missionId, name, notes } = parsed.data;
  const vehicleId = parsed.data.vehicleId || null;

  if (id) {
    await db.missionCrew.update({ where: { id }, data: { name, vehicleId, notes } });
  } else {
    await db.missionCrew.create({ data: { missionId, name, vehicleId, notes } });
  }

  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

export async function deleteCrew(missionId: string, crewId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.missionCrew.delete({ where: { id: crewId } });
  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

// ─── Assignments ────────────────────────────────────────────────────

const assignmentSchema = z.object({
  missionId: z.string().min(1),
  personnelId: z.string().min(1, "Pick a team member"),
  role: z.string().trim().default(""),
  crewId: z.string().optional(),
});

export async function saveAssignment(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "You don't have permission to edit missions." };
  }

  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { missionId, personnelId, role } = parsed.data;
  const crewId = parsed.data.crewId || null;

  await db.missionAssignment.upsert({
    where: { missionId_personnelId: { missionId, personnelId } },
    update: { role, crewId },
    create: { missionId, personnelId, role, crewId },
  });

  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

export async function removeAssignment(missionId: string, assignmentId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.missionAssignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

// ─── Vehicles on mission ────────────────────────────────────────────

export async function addMissionVehicle(missionId: string, vehicleId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.missionVehicle.upsert({
    where: { missionId_vehicleId: { missionId, vehicleId } },
    update: {},
    create: { missionId, vehicleId },
  });
  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}

export async function removeMissionVehicle(missionId: string, vehicleId: string): Promise<ActionResult> {
  try {
    await assertPermission("mission.edit");
  } catch {
    return { ok: false, error: "No permission." };
  }
  await db.missionVehicle.delete({ where: { missionId_vehicleId: { missionId, vehicleId } } });
  // Crews pointing at this vehicle keep their vehicleId — clear it if it was mission-scoped.
  await db.missionCrew.updateMany({ where: { missionId, vehicleId }, data: { vehicleId: null } });
  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}
