"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal, useModal } from "@/components/ui/modal";
import { Card, CardHeader } from "@/components/ui/card";
import { AddressInput } from "@/components/address-input";
import { MapPicker, type MapAnchor } from "@/components/map-picker";
import { PhoneInput } from "@/components/phone-input";
import { IconCross } from "@/components/icons";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { saveLocalEms } from "../actions";
import { displayAddress } from "@/lib/address";

export type LocalEmsData = {
  missionId: string;
  localEmsName: string;
  localEmsDispatchPhone: string;
  localEmsPocName: string;
  localEmsPocPhone: string;
  stagingAddress: string;
  stagingLat: number | null;
  stagingLng: number | null;
};

type MapProps = {
  mapsApiKey: string | null;
  mapView: { lat: number; lng: number; zoom: number; type: string };
  /** Mission target, shown on the staging map for context. */
  anchor: MapAnchor | null;
};

export function LocalEmsCard({ data, canEdit, ...map }: { data: LocalEmsData; canEdit: boolean } & MapProps) {
  const isEmpty =
    !data.localEmsName && !data.localEmsDispatchPhone && !data.localEmsPocName && !data.stagingAddress;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <IconCross className="size-3.5" /> Local EMS
          </span>
        }
        action={
          canEdit && (
            <Modal title="Local EMS" trigger={<Button variant="ghost" size="sm">{isEmpty ? "Set" : "Edit"}</Button>}>
              <LocalEmsForm data={data} {...map} />
            </Modal>
          )
        }
      />
      {isEmpty ? (
        <p className="px-4 py-5 text-center text-[13px] text-ink-faint">
          No local EMS details yet. They feed the med plan&apos;s Local EMS section.
        </p>
      ) : (
        <dl className="space-y-2 px-4 py-3 text-sm">
          {data.localEmsName && <Row label="Service" value={data.localEmsName} />}
          {data.localEmsDispatchPhone && <Row label="Dispatch" value={data.localEmsDispatchPhone} mono />}
          {data.localEmsPocName && (
            <Row
              label="POC"
              value={data.localEmsPocPhone ? `${data.localEmsPocName} · ${data.localEmsPocPhone}` : data.localEmsPocName}
            />
          )}
          {data.stagingAddress && <Row label="Staging" value={displayAddress(data.stagingAddress)} />}
        </dl>
      )}
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="kicker w-16 shrink-0 pt-0.5">{label}</dt>
      <dd className={`min-w-0 flex-1 ${mono ? "data text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}

function LocalEmsForm({ data, mapsApiKey, mapView, anchor }: { data: LocalEmsData } & MapProps) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveLocalEms, null);
  const [showManual, setShowManual] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    data.stagingLat !== null && data.stagingLng !== null ? { lat: data.stagingLat, lng: data.stagingLng } : null,
  );
  // Only a pin the user moved overrides the address — otherwise editing the
  // address re-geocodes as before.
  const [pinMoved, setPinMoved] = useState(false);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="missionId" value={data.missionId} />
      {pinMoved && picked && !showManual && (
        <>
          <input type="hidden" name="manualLat" value={String(picked.lat)} />
          <input type="hidden" name="manualLng" value={String(picked.lng)} />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Service name">
          <Input name="localEmsName" defaultValue={data.localEmsName} placeholder="Springfield EMS" />
        </Field>
        <Field label="Dispatch phone">
          <PhoneInput name="localEmsDispatchPhone" defaultValue={data.localEmsDispatchPhone} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Point of contact">
          <Input name="localEmsPocName" defaultValue={data.localEmsPocName} placeholder="Deputy Chief Smith" />
        </Field>
        <Field label="POC phone">
          <PhoneInput name="localEmsPocPhone" defaultValue={data.localEmsPocPhone} placeholder="(555) 555-0101" />
        </Field>
      </div>

      <Field label="Staging location">
        <AddressInput
          name="stagingAddress"
          defaultValue={data.stagingAddress}
          placeholder="Station 2, 10 Fire Rd — ETA to target computes at generation"
        />
      </Field>

      {mapsApiKey && (
        <MapPicker
          apiKey={mapsApiKey}
          initialView={mapView}
          anchor={anchor}
          value={picked}
          onChange={(point) => {
            setPicked(point);
            setPinMoved(true);
          }}
          pinLabel="EMS"
          hint={
            anchor
              ? "Optional: tap the map to pin the exact staging spot — the ring marks the target"
              : "Optional: tap the map to pin the exact staging spot"
          }
        />
      )}

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="text-[12px] text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
      >
        {showManual ? "Hide manual coordinates" : "Enter staging coordinates manually"}
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
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
