"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { missionUserIds, notifyUsers } from "@/lib/push";
import { formatDateTime, timezoneShort } from "@/lib/format";
import type { ActionResult } from "@/app/(app)/facilities/actions";

const schema = z.object({
  missionId: z.string().min(1),
  crewId: z.string().min(1),
  statusTypeId: z.string().min(1, "Pick a status"),
  note: z.string().trim().max(200).default(""),
});

export async function setCrewStatus(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { missionId, crewId, statusTypeId, note } = parsed.data;
  return postCrewStatus(missionId, crewId, statusTypeId, note);
}

/** Core status poster — also used for the one-tap "advance to next" flow. */
export async function postCrewStatus(
  missionId: string,
  crewId: string,
  statusTypeId: string,
  note = "",
): Promise<ActionResult> {
  let user;
  try {
    user = await assertPermission("status.set");
  } catch {
    return { ok: false, error: "You don't have permission to set crew status." };
  }

  const [crew, statusType] = await Promise.all([
    db.missionCrew.findUnique({ where: { id: crewId }, include: { mission: true } }),
    db.crewStatusType.findUnique({ where: { id: statusTypeId } }),
  ]);
  if (!crew || crew.missionId !== missionId) return { ok: false, error: "Crew not found on this mission." };
  if (!statusType || !statusType.isActive) return { ok: false, error: "Unknown status." };

  const event = await db.crewStatusEvent.create({
    data: { missionId, crewId, statusTypeId, note, createdById: user.id },
  });

  // Best-effort push to everyone assigned to this mission (except the setter).
  const userIds = await missionUserIds(missionId, user.id);
  await notifyUsers(userIds, {
    title: `${crew.name}: ${statusType.name}`,
    body: `${crew.mission.name}${note ? ` — ${note}` : ""} · ${formatDateTime(event.createdAt)} ${timezoneShort()}`,
    url: `/missions/${missionId}`,
  });

  revalidatePath(`/missions/${missionId}`);
  return { ok: true };
}
