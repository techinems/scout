"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { saveVehicle } from "./actions";

export type VehicleFormData = {
  id: string;
  designator: string;
  type: string;
  plate: string;
  notes: string;
};

export function VehicleForm({ initial }: { initial?: VehicleFormData }) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveVehicle, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-[130px_1fr] gap-3">
        <Field label="Designator">
          <Input name="designator" defaultValue={initial?.designator} placeholder="TacMed 1" required className="data" />
        </Field>
        <Field label="Type">
          <Input name="type" defaultValue={initial?.type} placeholder="Tactical medical vehicle" />
        </Field>
      </div>

      <Field label="Plate">
        <Input name="plate" defaultValue={initial?.plate} placeholder="MA 1234-XY" className="data" />
      </Field>

      <Field label="Notes">
        <Textarea name="notes" defaultValue={initial?.notes} placeholder="Equipment loadout, quirks…" />
      </Field>

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
