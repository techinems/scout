"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal, useModal } from "@/components/ui/modal";
import { IconTrash } from "@/components/icons";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { MISSION_STATUS_LABEL, MISSION_STATUSES } from "@/lib/mission-status";
import type { MissionStatus, LocationKind } from "@/generated/prisma/enums";
import { MapPicker } from "@/components/map-picker";
import { AddressInput } from "@/components/address-input";
import { LOCATION_KIND_LABEL, LOCATION_KINDS } from "./location-kind";
import {
  addMissionVehicle,
  deleteCrew,
  deleteLocation,
  deleteMission,
  removeAssignment,
  removeMissionVehicle,
  saveAssignment,
  saveCrew,
  saveLocation,
  setMissionStatus,
  updateMissionBasics,
} from "../actions";

// ─── Basics ─────────────────────────────────────────────────────────

export function MissionBasicsForm({
  mission,
}: {
  mission: { id: string; name: string; status: MissionStatus; goTimeLocal: string; briefing: string; comms: string };
}) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(updateMissionBasics, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={mission.id} />
      <Field label="Mission name">
        <Input name="name" defaultValue={mission.name} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select name="status" defaultValue={mission.status}>
            {MISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MISSION_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Go-time (Eastern)">
          <Input name="goTime" type="datetime-local" defaultValue={mission.goTimeLocal} className="data" />
        </Field>
      </div>
      <Field label="Briefing notes">
        <Textarea name="briefing" defaultValue={mission.briefing} />
      </Field>
      <Field label="Comms / channels (one per line, shown in the med plan)">
        <Textarea name="comms" defaultValue={mission.comms} placeholder={"STOP1e\nSOPS3"} className="data" />
      </Field>
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm("Delete this mission and everything attached to it?")) {
              void deleteMission(mission.id);
            }
          }}
        >
          <IconTrash /> Delete mission
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function StatusSelect({ missionId, status }: { missionId: string; status: MissionStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as MissionStatus;
        startTransition(async () => {
          await setMissionStatus(missionId, next);
          router.refresh();
        });
      }}
      className="!w-auto"
    >
      {MISSION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {MISSION_STATUS_LABEL[s]}
        </option>
      ))}
    </Select>
  );
}

// ─── Locations ──────────────────────────────────────────────────────

export type MapView = { lat: number; lng: number; zoom: number };

export type LocationData = {
  id: string;
  kind: LocationKind;
  label: string;
  address: string;
  notes: string;
};

export function LocationForm({
  missionId,
  initial,
  mapsApiKey,
  mapView,
}: {
  missionId: string;
  initial?: LocationData & { lat?: number; lng?: number };
  mapsApiKey: string | null;
  mapView: MapView;
}) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveLocation, null);
  const [showManual, setShowManual] = useState(false);
  const [kind, setKind] = useState<LocationKind>(initial?.kind ?? "TARGET");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    initial?.lat !== undefined && initial?.lng !== undefined ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const isLz = kind === "LZ";

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="missionId" value={missionId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {isLz && picked && (
        <>
          <input type="hidden" name="manualLat" value={String(picked.lat)} />
          <input type="hidden" name="manualLng" value={String(picked.lng)} />
        </>
      )}

      <div className="grid grid-cols-[140px_1fr] gap-3">
        <Field label="Kind">
          <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as LocationKind)}>
            {LOCATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {LOCATION_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Label (optional)">
          <Input name="label" defaultValue={initial?.label} placeholder={isLz ? "LZ Alpha…" : "Primary target, Rally point A…"} />
        </Field>
      </div>

      {isLz &&
        (mapsApiKey ? (
          <MapPicker apiKey={mapsApiKey} initialView={mapView} value={picked} onChange={setPicked} />
        ) : (
          <p className="rounded-(--radius-control) border border-warn/40 bg-warn-soft px-3 py-2 text-[12px] text-warn">
            No Maps key configured — enter the LZ coordinates manually below.
          </p>
        ))}

      <Field label={isLz ? "Address / description (optional)" : "Address"}>
        <AddressInput
          name="address"
          defaultValue={initial?.address}
          placeholder={isLz ? "HS football field, School St…" : "123 Main St, Anytown, ST"}
          required={!isLz}
        />
      </Field>

      <Field label="Notes">
        <Textarea name="notes" defaultValue={initial?.notes} placeholder="Approach, hazards, access…" />
      </Field>

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="text-[12px] text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
      >
        {showManual ? "Hide manual coordinates" : "Enter coordinates manually"}
      </button>
      {showManual && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input name="manualLat" placeholder="42.2626" className="data" />
          </Field>
          <Field label="Longitude">
            <Input name="manualLng" placeholder="-71.8023" className="data" />
          </Field>
        </div>
      )}

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save location" : "Add location"}
        </Button>
      </div>
    </form>
  );
}

export function LocationRowActions({
  missionId,
  location,
  mapsApiKey,
  mapView,
}: {
  missionId: string;
  location: LocationData & { lat: number; lng: number };
  mapsApiKey: string | null;
  mapView: MapView;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Modal title="Edit location" trigger={<Button variant="ghost" size="sm">Edit</Button>}>
        <LocationForm missionId={missionId} initial={location} mapsApiKey={mapsApiKey} mapView={mapView} />
      </Modal>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="!text-ink-faint hover:!text-danger"
        onClick={() => startTransition(async () => { await deleteLocation(missionId, location.id); })}
        aria-label="Remove location"
      >
        <IconTrash />
      </Button>
    </div>
  );
}

// ─── Crews ──────────────────────────────────────────────────────────

export type VehicleOption = { id: string; designator: string };
export type CrewData = { id: string; name: string; vehicleId: string; notes: string };

export function CrewForm({
  missionId,
  vehicles,
  initial,
}: {
  missionId: string;
  vehicles: VehicleOption[];
  initial?: CrewData;
}) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveCrew, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="missionId" value={missionId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Crew name">
          <Input name="name" defaultValue={initial?.name} placeholder="Alpha" required />
        </Field>
        <Field label="Vehicle">
          <Select name="vehicleId" defaultValue={initial?.vehicleId ?? ""}>
            <option value="">None</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.designator}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Input name="notes" defaultValue={initial?.notes} placeholder="Tasking…" />
      </Field>
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save crew" : "Add crew"}
        </Button>
      </div>
    </form>
  );
}

export function CrewDelete({ missionId, crewId }: { missionId: string; crewId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="!text-ink-faint hover:!text-danger"
      onClick={() => {
        if (confirm("Remove this crew? Members return to the unassigned pool.")) {
          startTransition(async () => { await deleteCrew(missionId, crewId); });
        }
      }}
      aria-label="Remove crew"
    >
      <IconTrash />
    </Button>
  );
}

// ─── Assignments ────────────────────────────────────────────────────

export type PersonnelOption = { id: string; name: string; callsign: string; title: string };
export type CrewOption = { id: string; name: string };

export function AssignmentForm({
  missionId,
  personnel,
  crews,
  initial,
}: {
  missionId: string;
  personnel: PersonnelOption[];
  crews: CrewOption[];
  initial?: { personnelId: string; role: string; crewId: string };
}) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveAssignment, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="missionId" value={missionId} />
      <Field label="Team member">
        {initial ? (
          <>
            <input type="hidden" name="personnelId" value={initial.personnelId} />
            <Input
              value={personnel.find((p) => p.id === initial.personnelId)?.name ?? ""}
              disabled
            />
          </>
        ) : (
          <Select name="personnelId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {personnel.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.callsign ? ` (${p.callsign})` : ""}
                {p.title ? ` — ${p.title}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mission role">
          <Input name="role" defaultValue={initial?.role} placeholder="Crew lead, Medic…" />
        </Field>
        <Field label="Crew">
          <Select name="crewId" defaultValue={initial?.crewId ?? ""}>
            <option value="">Unassigned</option>
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save assignment" : "Assign"}
        </Button>
      </div>
    </form>
  );
}

export function AssignmentRemove({ missionId, assignmentId }: { missionId: string; assignmentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="!text-ink-faint hover:!text-danger"
      onClick={() => startTransition(async () => { await removeAssignment(missionId, assignmentId); })}
      aria-label="Remove assignment"
    >
      <IconTrash />
    </Button>
  );
}

// ─── Mission vehicles ───────────────────────────────────────────────

export function MissionVehiclePicker({
  missionId,
  available,
}: {
  missionId: string;
  available: VehicleOption[];
}) {
  const [pending, startTransition] = useTransition();
  if (available.length === 0) return null;
  return (
    <Select
      defaultValue=""
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        if (id) startTransition(async () => { await addMissionVehicle(missionId, id); });
        e.target.value = "";
      }}
      className="!h-7 !w-auto text-xs"
    >
      <option value="" disabled>
        Add vehicle…
      </option>
      {available.map((v) => (
        <option key={v.id} value={v.id}>
          {v.designator}
        </option>
      ))}
    </Select>
  );
}

export function MissionVehicleRemove({ missionId, vehicleId }: { missionId: string; vehicleId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await removeMissionVehicle(missionId, vehicleId); })}
      className="text-ink-faint transition-colors hover:text-danger"
      aria-label="Remove vehicle from mission"
    >
      ✕
    </button>
  );
}
