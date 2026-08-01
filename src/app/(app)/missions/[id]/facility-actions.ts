"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/current-user";
import { driveMatrix, haversineMeters } from "@/lib/google/routes";
import { appConfig } from "@/lib/app-config";
import { formatGoTime, formatDateTime, metersToMiles, minutesToHuman, toDDM, townFromAddress } from "@/lib/format";
import { renderTemplate, type TemplateContext } from "@/lib/medplan/template";
import { DEFAULT_MEDPLAN_TEMPLATE, MEDPLAN_TEMPLATE_KEY } from "@/lib/medplan/default-template";

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

  // ── Assemble the template context ──
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
  const locations = kindOrder.flatMap((kind) =>
    mission.locations
      .filter((l) => l.kind === kind)
      .map((l) => ({
        kindLabel: kindLabel[kind],
        label: l.label,
        address: l.address,
        notes: l.notes,
        ddm: kind === "LZ" ? toDDM(l.lat, l.lng) : "",
      })),
  );

  const aero = appConfig.aeromedical;
  const cruiseMph = aero.cruiseSpeedKnots * 1.15078;
  // Aircraft fly to the LZ when one is set, else overhead the target.
  const flightDest = lzs[0] ?? target;
  const facilityRows = categories.flatMap((category) => {
    const hit = best.get(category.id);
    if (!hit) return [];
    const f = hit.facility;
    let air = "";
    if (category.isAeromedical) {
      const flightMiles =
        haversineMeters({ lat: f.lat, lng: f.lng }, { lat: flightDest.lat, lng: flightDest.lng }) / 1609.344;
      const flightMin = (flightMiles / cruiseMph) * 60;
      const totalMin = aero.launchMinutes + flightMin + aero.landingBufferMinutes;
      air =
        `~${Math.ceil(totalMin)} min (${aero.launchMinutes} launch + ${Math.ceil(flightMin)} flight @ ` +
        `${aero.cruiseSpeedKnots} kt + ${aero.landingBufferMinutes} land) to ${lzs[0] ? "LZ" : "TGT"}`;
    }
    return [
      {
        categoryLabel: category.noteLabel,
        name: f.name,
        extras: [f.traumaLevel && `Lvl ${f.traumaLevel}`, f.hasHelipad && "helipad"].filter(Boolean).join(", "),
        address: f.address,
        eta:
          hit.durationMin !== null
            ? `${minutesToHuman(hit.durationMin)} / ${metersToMiles(hit.distanceMeters)}`
            : `${metersToMiles(hit.distanceMeters)} direct`,
        phone: f.phone,
        air,
        lzCoords: category.isAeromedical && lzs[0] ? toDDM(lzs[0].lat, lzs[0].lng) : "",
      },
    ];
  });

  const crews = mission.crews.map((crew) => ({
    name: crew.name,
    vehicle: crew.vehicle?.designator ?? "",
    members:
      crew.members
        .map((m) => {
          const cs = m.personnel.callsign ? ` [${m.personnel.callsign}]` : "";
          const role = m.role ? ` (${m.role})` : "";
          return `${m.personnel.name}${cs}${role}`;
        })
        .join(", ") || "unstaffed",
  }));
  const pool = mission.assignments.filter((a) => !a.crewId);
  const looseVehicles = mission.vehicles.filter((mv) => !mission.crews.some((c) => c.vehicleId === mv.vehicleId));

  // Town: from the meet location, falling back to the target.
  const meet = mission.locations.find((l) => l.kind === "MEET");
  const missionTown = townFromAddress(meet?.address ?? "") || townFromAddress(target.address);

  // Local EMS staging ETA to target, traffic-aware when routable.
  let localEmsStagingEta = "";
  if (mission.localEmsStagingLat !== null && mission.localEmsStagingLng !== null) {
    try {
      const stagingMatrix = await driveMatrix(
        { lat: mission.localEmsStagingLat, lng: mission.localEmsStagingLng },
        [{ lat: target.lat, lng: target.lng }],
        mission.goTime,
      );
      const leg = stagingMatrix.legs[0];
      if (leg) {
        localEmsStagingEta =
          leg.durationMin !== null
            ? `${minutesToHuman(leg.durationMin)} / ${metersToMiles(leg.distanceMeters)} to TGT`
            : `${metersToMiles(leg.distanceMeters)} direct to TGT`;
      }
    } catch (err) {
      console.error("Local EMS staging ETA failed:", err);
    }
  }
  const hasLocalEms = Boolean(
    mission.localEmsName ||
      mission.localEmsDispatchPhone ||
      mission.localEmsPocName ||
      mission.localEmsStagingAddress,
  );

  const context: TemplateContext = {
    missionName: mission.name,
    missionTown,
    goTime: `${formatGoTime(mission.goTime)} ET`,
    trafficNote: matrix.trafficAware ? "drive from TGT @ go-time" : "straight-line — routing unavailable",
    generatedAt: `${formatDateTime(new Date())} ET`,
    generatedBy: user.name,
    hasLocations: locations.length > 0,
    locations,
    facilities: facilityRows,
    hasCrews: mission.crews.length > 0 || mission.assignments.length > 0,
    crews,
    unassigned: pool.map((a) => a.personnel.name).join(", "),
    looseVehicles: looseVehicles.map((mv) => mv.vehicle.designator).join(", "),
    hasLocalEms,
    localEmsName: mission.localEmsName,
    localEmsDispatchPhone: mission.localEmsDispatchPhone,
    localEmsPocName: mission.localEmsPocName,
    localEmsPocPhone: mission.localEmsPocPhone,
    localEmsStaging: mission.localEmsStagingAddress,
    localEmsStagingEta,
  };

  const setting = await db.appSetting.findUnique({ where: { key: MEDPLAN_TEMPLATE_KEY } });
  const template = setting?.value ?? DEFAULT_MEDPLAN_TEMPLATE;
  let content: string;
  try {
    content = renderTemplate(template, context);
  } catch (err) {
    console.error("Custom med plan template failed, falling back to default:", err);
    content = renderTemplate(DEFAULT_MEDPLAN_TEMPLATE, context);
  }

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
