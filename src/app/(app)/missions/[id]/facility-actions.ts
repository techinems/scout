"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { driveMatrix, haversineMeters } from "@/lib/google/routes";
import { appConfig } from "@/lib/app-config";
import { formatGoTime, formatDateTime, metersToMiles, minutesToHuman, toDDM } from "@/lib/format";

export type GenerateResult = { ok: true; content: string } | { ok: false; error: string };

/**
 * Build the med plan: for each facility category, find the closest active
 * facility (drive time at go-time when routable). Aeromedical categories
 * additionally get a request→landing estimate (configurable launch time +
 * straight-line flight at cruise speed to the LZ, or target if no LZ).
 * Rendered as a concise plain-text note a team member can drop into iOS Notes.
 */
export async function generateFacilityPlan(missionId: string): Promise<GenerateResult> {
  let user;
  try {
    user = await assertPermission("note.generate");
  } catch {
    return { ok: false, error: "You don't have permission to generate notes." };
  }

  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: {
      locations: true,
      crews: { orderBy: { sortOrder: "asc" }, include: { vehicle: true, members: { include: { personnel: true } } } },
      assignments: { include: { personnel: true } },
      vehicles: { include: { vehicle: true } },
    },
  });
  if (!mission) return { ok: false, error: "Mission not found." };

  const target = mission.locations.find((l) => l.kind === "TARGET");
  if (!target) return { ok: false, error: "Set a TARGET location first — distances are computed from it." };

  const facilities = await db.facility.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  if (facilities.length === 0) return { ok: false, error: "No active facilities on file." };

  let matrix;
  try {
    matrix = await driveMatrix(
      { lat: target.lat, lng: target.lng },
      facilities.map((f) => ({ lat: f.lat, lng: f.lng })),
      mission.goTime,
    );
  } catch (err) {
    console.error("Route matrix failed:", err);
    return { ok: false, error: "Routing service failed — try again shortly." };
  }

  // Nearest facility per category: prefer drive time, fall back to distance.
  type Scored = { facility: (typeof facilities)[number]; durationMin: number | null; distanceMeters: number };
  const best = new Map<string, Scored>();
  for (const leg of matrix.legs) {
    const facility = facilities[leg.destinationIndex];
    const current = best.get(facility.categoryId);
    const better =
      !current ||
      (leg.durationMin !== null && current.durationMin !== null
        ? leg.durationMin < current.durationMin
        : leg.distanceMeters < current.distanceMeters);
    if (better) {
      best.set(facility.categoryId, {
        facility,
        durationMin: leg.durationMin,
        distanceMeters: leg.distanceMeters,
      });
    }
  }

  const categories = await db.facilityCategory.findMany({ orderBy: { sortOrder: "asc" } });

  // ── Render the med plan ──
  const lines: string[] = [];
  lines.push(`MED PLAN — ${mission.name.toUpperCase()}`);
  lines.push(`Go-time: ${formatGoTime(mission.goTime)} ET`);
  lines.push("");

  const kindOrder = ["MEET", "BRIEF", "STAGING", "TARGET", "LZ", "OTHER"] as const;
  const kindLabel: Record<string, string> = {
    MEET: "MEET",
    BRIEF: "BRIEF",
    STAGING: "STAGE",
    TARGET: "TGT",
    LZ: "LZ",
    OTHER: "LOC",
  };
  const lzs = mission.locations.filter((l) => l.kind === "LZ");
  for (const kind of kindOrder) {
    for (const loc of mission.locations.filter((l) => l.kind === kind)) {
      lines.push(`${kindLabel[kind]}: ${loc.label ? `${loc.label} — ` : ""}${loc.address}`);
      // LZs carry radio-readable coordinates.
      if (kind === "LZ") lines.push(`  ${toDDM(loc.lat, loc.lng)}`);
    }
  }
  lines.push("");

  lines.push(
    matrix.trafficAware
      ? `CLOSEST FACILITIES (drive from TGT @ go-time)`
      : `CLOSEST FACILITIES (straight-line — routing unavailable)`,
  );
  const aero = appConfig.aeromedical;
  const cruiseMph = aero.cruiseSpeedKnots * 1.15078;
  // Aircraft fly to the LZ when one is set, else overhead the target.
  const flightDest = lzs[0] ?? target;
  for (const category of categories) {
    const hit = best.get(category.id);
    if (!hit) continue;
    const f = hit.facility;
    const extras = [f.traumaLevel && `Lvl ${f.traumaLevel}`, f.hasHelipad && "helipad"].filter(Boolean).join(", ");
    const eta =
      hit.durationMin !== null
        ? `${minutesToHuman(hit.durationMin)} / ${metersToMiles(hit.distanceMeters)}`
        : `${metersToMiles(hit.distanceMeters)} direct`;
    lines.push(`${category.noteLabel}: ${f.name}${extras ? ` (${extras})` : ""}`);
    lines.push(`  ${f.address} · ${eta}`);
    if (f.phone) lines.push(`  ${f.phone}`);

    if (category.isAeromedical) {
      const flightMiles = haversineMeters({ lat: f.lat, lng: f.lng }, { lat: flightDest.lat, lng: flightDest.lng }) / 1609.344;
      const flightMin = (flightMiles / cruiseMph) * 60;
      const totalMin = aero.launchMinutes + flightMin + aero.landingBufferMinutes;
      lines.push(
        `  Est request→landing: ~${Math.ceil(totalMin)} min ` +
          `(${aero.launchMinutes} launch + ${Math.ceil(flightMin)} flight @ ${aero.cruiseSpeedKnots} kt + ${aero.landingBufferMinutes} land)` +
          ` to ${lzs[0] ? "LZ" : "TGT"}`,
      );
      if (lzs[0]) lines.push(`  LZ coords: ${toDDM(lzs[0].lat, lzs[0].lng)}`);
    }
  }
  lines.push("");

  if (mission.crews.length > 0 || mission.assignments.length > 0) {
    lines.push("CREWS");
    for (const crew of mission.crews) {
      const members = crew.members
        .map((m) => {
          const cs = m.personnel.callsign ? ` [${m.personnel.callsign}]` : "";
          const role = m.role ? ` (${m.role})` : "";
          return `${m.personnel.name}${cs}${role}`;
        })
        .join(", ");
      lines.push(`${crew.name}${crew.vehicle ? ` — ${crew.vehicle.designator}` : ""}: ${members || "unstaffed"}`);
    }
    const pool = mission.assignments.filter((a) => !a.crewId);
    if (pool.length > 0) {
      lines.push(`Unassigned: ${pool.map((a) => a.personnel.name).join(", ")}`);
    }
    const looseVehicles = mission.vehicles.filter((mv) => !mission.crews.some((c) => c.vehicleId === mv.vehicleId));
    if (looseVehicles.length > 0) {
      lines.push(`Vehicles: ${looseVehicles.map((mv) => mv.vehicle.designator).join(", ")}`);
    }
    lines.push("");
  }

  lines.push(`Generated ${formatDateTime(new Date())} ET by ${user.name}`);
  const content = lines.join("\n");

  await db.missionNote.create({
    data: {
      missionId,
      content,
      generatedById: user.id,
      params: {
        origin: { lat: target.lat, lng: target.lng, address: target.address },
        departureTime: mission.goTime?.toISOString() ?? null,
        trafficAware: matrix.trafficAware,
        facilityCount: facilities.length,
      },
    },
  });

  revalidatePath(`/missions/${missionId}`);
  return { ok: true, content };
}
