"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { AddressInput } from "@/components/address-input";
import { saveFacility, type ActionResult } from "./actions";

export type CategoryOption = { id: string; name: string };

export type FacilityFormData = {
  id: string;
  name: string;
  categoryId: string;
  address: string;
  phone: string;
  traumaLevel: string;
  hasHelipad: boolean;
  notes: string;
};

export function FacilityForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: FacilityFormData;
}) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveFacility, null);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <Field label="Facility name">
        <Input name="name" defaultValue={initial?.name} placeholder="General Hospital — Main Campus" required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select name="categoryId" defaultValue={initial?.categoryId ?? categories[0]?.id} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={initial?.phone} placeholder="(508) 555-0100" />
        </Field>
      </div>

      <Field label="Address">
        <AddressInput name="address" defaultValue={initial?.address} placeholder="100 Hospital Dr, Anytown, ST" required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trauma level (if any)">
          <Select name="traumaLevel" defaultValue={initial?.traumaLevel ?? ""}>
            <option value="">None</option>
            <option value="I">Level I</option>
            <option value="II">Level II</option>
            <option value="III">Level III</option>
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            name="hasHelipad"
            value="true"
            defaultChecked={initial?.hasHelipad}
            className="size-4 accent-(--color-accent)"
          />
          Has helipad
        </label>
      </div>

      <Field label="Notes">
        <Textarea name="notes" defaultValue={initial?.notes} placeholder="Entry instructions, radio channel, contacts…" />
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
            <Input name="manualLat" placeholder="42.276943" className="data" />
          </Field>
          <Field label="Longitude">
            <Input name="manualLng" placeholder="-71.762233" className="data" />
          </Field>
        </div>
      )}

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Add facility"}
        </Button>
      </div>
    </form>
  );
}
