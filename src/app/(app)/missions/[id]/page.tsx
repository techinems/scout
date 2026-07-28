import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { IconClock, IconPin, IconPlus, IconUsers } from "@/components/icons";
import { MISSION_STATUS_LABEL, MISSION_STATUS_TONE } from "@/lib/mission-status";
import { formatClock, formatGoTime, toDatetimeLocalValue } from "@/lib/format";
import { CrewStatusButton } from "./crew-status";
import { LOCATION_KIND_LABEL, LOCATION_KIND_TONE } from "./location-kind";
import {
  AssignmentForm,
  AssignmentRemove,
  CrewDelete,
  CrewForm,
  LocationForm,
  LocationRowActions,
  MissionBasicsForm,
  MissionVehiclePicker,
  MissionVehicleRemove,
} from "./mission-forms";
import { FacilityPlan } from "./facility-plan";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("mission.view");
  const canEdit = user.permissions.has("mission.edit");
  const { id } = await params;

  const mission = await db.mission.findUnique({
    where: { id },
    include: {
      locations: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      crews: {
        orderBy: { sortOrder: "asc" },
        include: {
          vehicle: true,
          members: { include: { personnel: true } },
          statusEvents: { orderBy: { createdAt: "desc" }, take: 1, include: { statusType: true } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { statusType: true, crew: true, createdBy: true },
      },
      assignments: { include: { personnel: true, crew: true }, orderBy: { personnel: { name: "asc" } } },
      vehicles: { include: { vehicle: true } },
      notes: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });
  if (!mission) notFound();

  const [allPersonnel, allVehicles, statusTypes] = await Promise.all([
    db.personnel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.vehicle.findMany({ where: { isActive: true }, orderBy: { designator: "asc" } }),
    db.crewStatusType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const canSetStatus = user.permissions.has("status.set");
  const statusTypeOptions = statusTypes.map((t) => ({
    id: t.id,
    name: t.name,
    shortCode: t.shortCode,
    color: t.color,
  }));

  const unassigned = mission.assignments.filter((a) => !a.crewId);
  const missionVehicleIds = new Set(mission.vehicles.map((v) => v.vehicleId));
  const availableVehicles = allVehicles.filter((v) => !missionVehicleIds.has(v.id));
  const missionVehicleOptions = mission.vehicles.map((mv) => ({
    id: mv.vehicle.id,
    designator: mv.vehicle.designator,
  }));
  const assignablePersonnel = allPersonnel.filter(
    (p) => !mission.assignments.some((a) => a.personnelId === p.id),
  );
  const crewOptions = mission.crews.map((c) => ({ id: c.id, name: c.name }));
  const target = mission.locations.find((l) => l.kind === "TARGET") ?? null;
  const mapsApiKey = process.env.GOOGLE_MAPS_BROWSER_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? null;

  return (
    <div className="space-y-6">
      <header>
        <Link href="/missions" className="text-[12px] text-ink-faint hover:text-ink-muted">
          ← Missions
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{mission.name}</h1>
          <Badge tone={MISSION_STATUS_TONE[mission.status]}>{MISSION_STATUS_LABEL[mission.status]}</Badge>
          <span className="data flex items-center gap-1.5 text-[13px] text-ink-muted">
            <IconClock className="size-3.5" />
            {formatGoTime(mission.goTime)}
          </span>
          {canEdit && (
            <Modal title="Edit mission" trigger={<Button variant="outline" size="sm">Edit</Button>}>
              <MissionBasicsForm
                mission={{
                  id: mission.id,
                  name: mission.name,
                  status: mission.status,
                  goTimeLocal: toDatetimeLocalValue(mission.goTime),
                  briefing: mission.briefing,
                }}
              />
            </Modal>
          )}
        </div>
        {mission.briefing && (
          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-ink-muted">{mission.briefing}</p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Locations */}
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-1.5">
                  <IconPin className="size-3.5" /> Locations
                </span>
              }
              action={
                canEdit && (
                  <Modal title="Add location" trigger={<Button variant="ghost" size="sm"><IconPlus /> Add</Button>}>
                    <LocationForm missionId={mission.id} mapsApiKey={mapsApiKey} />
                  </Modal>
                )
              }
            />
            {mission.locations.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-faint">
                No locations yet. Add the target first — the facility plan depends on it.
              </p>
            ) : (
              <ul className="divide-y divide-edge">
                {mission.locations.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Badge tone={LOCATION_KIND_TONE[l.kind]} dot={false} className="w-[72px] justify-center">
                      {LOCATION_KIND_LABEL[l.kind]}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {l.label && <span className="font-medium">{l.label} — </span>}
                        {l.address}
                      </p>
                      {l.notes && <p className="truncate text-[12px] text-ink-faint">{l.notes}</p>}
                    </div>
                    <span className="data hidden text-[11px] text-ink-faint xl:block">
                      {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                    </span>
                    {canEdit && (
                      <LocationRowActions
                        missionId={mission.id}
                        location={{
                          id: l.id,
                          kind: l.kind,
                          label: l.label,
                          address: l.address,
                          notes: l.notes,
                          lat: l.lat,
                          lng: l.lng,
                        }}
                        mapsApiKey={mapsApiKey}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Crews */}
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-1.5">
                  <IconUsers className="size-3.5" /> Crews & assignments
                </span>
              }
              action={
                canEdit && (
                  <div className="flex gap-1.5">
                    <Modal title="Add crew" trigger={<Button variant="ghost" size="sm"><IconPlus /> Crew</Button>}>
                      <CrewForm missionId={mission.id} vehicles={missionVehicleOptions} />
                    </Modal>
                    <Modal
                      title="Assign personnel"
                      trigger={<Button variant="ghost" size="sm"><IconPlus /> Assign</Button>}
                    >
                      <AssignmentForm
                        missionId={mission.id}
                        personnel={assignablePersonnel.map((p) => ({
                          id: p.id,
                          name: p.name,
                          callsign: p.callsign,
                          title: p.title,
                        }))}
                        crews={crewOptions}
                      />
                    </Modal>
                  </div>
                )
              }
            />
            <div className="space-y-4 p-4">
              {mission.crews.map((crew) => (
                <div key={crew.id} className="rounded-(--radius-control) border border-edge bg-surface-2">
                  <div className="flex items-center gap-2.5 border-b border-edge px-3 py-2">
                    <span className="text-sm font-semibold">{crew.name}</span>
                    {crew.vehicle && (
                      <Badge tone="info" dot={false} className="data">
                        {crew.vehicle.designator}
                      </Badge>
                    )}
                    {canSetStatus ? (
                      <CrewStatusButton
                        missionId={mission.id}
                        crewId={crew.id}
                        crewName={crew.name}
                        statusTypes={statusTypeOptions}
                        current={
                          crew.statusEvents[0]
                            ? {
                                typeId: crew.statusEvents[0].statusTypeId,
                                name: crew.statusEvents[0].statusType.name,
                                color: crew.statusEvents[0].statusType.color,
                                at: formatClock(crew.statusEvents[0].createdAt),
                              }
                            : null
                        }
                      />
                    ) : (
                      crew.statusEvents[0] && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${crew.statusEvents[0].statusType.color}26`,
                            color: crew.statusEvents[0].statusType.color,
                          }}
                        >
                          {crew.statusEvents[0].statusType.name}
                        </span>
                      )
                    )}
                    {crew.notes && <span className="truncate text-[12px] text-ink-faint">{crew.notes}</span>}
                    {canEdit && (
                      <span className="ml-auto flex items-center gap-1">
                        <Modal title="Edit crew" trigger={<Button variant="ghost" size="sm">Edit</Button>}>
                          <CrewForm
                            missionId={mission.id}
                            vehicles={missionVehicleOptions}
                            initial={{
                              id: crew.id,
                              name: crew.name,
                              vehicleId: crew.vehicleId ?? "",
                              notes: crew.notes,
                            }}
                          />
                        </Modal>
                        <CrewDelete missionId={mission.id} crewId={crew.id} />
                      </span>
                    )}
                  </div>
                  {crew.members.length === 0 ? (
                    <p className="px-3 py-3 text-[12px] text-ink-faint">No members yet.</p>
                  ) : (
                    <ul className="divide-y divide-edge/60">
                      {crew.members.map((m) => (
                        <AssignmentRow
                          key={m.id}
                          missionId={mission.id}
                          assignment={m}
                          personnel={allPersonnel}
                          crews={crewOptions}
                          canEdit={canEdit}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {unassigned.length > 0 && (
                <div>
                  <p className="kicker mb-1.5">Unassigned pool</p>
                  <ul className="divide-y divide-edge/60 rounded-(--radius-control) border border-edge">
                    {unassigned.map((a) => (
                      <AssignmentRow
                        key={a.id}
                        missionId={mission.id}
                        assignment={a}
                        personnel={allPersonnel}
                        crews={crewOptions}
                        canEdit={canEdit}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {mission.crews.length === 0 && mission.assignments.length === 0 && (
                <p className="py-2 text-center text-[13px] text-ink-faint">
                  Nobody assigned yet. Add a crew, then assign personnel to it.
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Vehicles */}
          <Card>
            <CardHeader
              title="Vehicles"
              action={canEdit && <MissionVehiclePicker missionId={mission.id} available={availableVehicles.map((v) => ({ id: v.id, designator: v.designator }))} />}
            />
            {mission.vehicles.length === 0 ? (
              <p className="px-4 py-5 text-center text-[13px] text-ink-faint">No vehicles attached.</p>
            ) : (
              <ul className="divide-y divide-edge">
                {mission.vehicles.map((mv) => (
                  <li key={mv.vehicleId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="data text-sm font-semibold">{mv.vehicle.designator}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink-faint">{mv.vehicle.type}</span>
                    {canEdit && <MissionVehicleRemove missionId={mission.id} vehicleId={mv.vehicleId} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Facility plan */}
          <FacilityPlan
            missionId={mission.id}
            target={target ? { label: target.label, address: target.address } : null}
            goTime={mission.goTime?.toISOString() ?? null}
            canGenerate={user.permissions.has("note.generate")}
            latestNote={
              mission.notes[0]
                ? { content: mission.notes[0].content, generatedAt: mission.notes[0].generatedAt.toISOString() }
                : null
            }
          />

          {/* Status timeline */}
          {mission.statusEvents.length > 0 && (
            <Card>
              <CardHeader title="Activity" />
              <ul className="max-h-96 divide-y divide-edge/60 overflow-y-auto">
                {mission.statusEvents.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span
                      className="mt-1 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: e.statusType.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">
                        <span className="font-semibold">{e.crew.name}</span>{" "}
                        <span style={{ color: e.statusType.color }}>{e.statusType.name}</span>
                      </p>
                      {e.note && <p className="truncate text-[12px] text-ink-muted">{e.note}</p>}
                      <p className="text-[11px] text-ink-faint">
                        {e.createdBy?.name ?? "—"}
                      </p>
                    </div>
                    <span className="data shrink-0 text-[11px] text-ink-faint">{formatClock(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignmentRow({
  missionId,
  assignment,
  personnel,
  crews,
  canEdit,
}: {
  missionId: string;
  assignment: {
    id: string;
    personnelId: string;
    role: string;
    crewId: string | null;
    personnel: { name: string; callsign: string; title: string };
  };
  personnel: { id: string; name: string; callsign: string; title: string }[];
  crews: { id: string; name: string }[];
  canEdit: boolean;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {assignment.personnel.name}
          {assignment.personnel.callsign && (
            <span className="data ml-2 text-[11px] text-accent-bright">{assignment.personnel.callsign}</span>
          )}
        </p>
        <p className="truncate text-[12px] text-ink-faint">
          {assignment.role || assignment.personnel.title || "—"}
        </p>
      </div>
      {canEdit && (
        <span className="flex items-center gap-1">
          <Modal title="Edit assignment" trigger={<Button variant="ghost" size="sm">Edit</Button>}>
            <AssignmentForm
              missionId={missionId}
              personnel={personnel.map((p) => ({ id: p.id, name: p.name, callsign: p.callsign, title: p.title }))}
              crews={crews}
              initial={{
                personnelId: assignment.personnelId,
                role: assignment.role,
                crewId: assignment.crewId ?? "",
              }}
            />
          </Modal>
          <AssignmentRemove missionId={missionId} assignmentId={assignment.id} />
        </span>
      )}
    </li>
  );
}
