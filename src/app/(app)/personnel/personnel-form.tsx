"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { appConfig } from "@/lib/app-config";
import { PhoneInput } from "@/components/phone-input";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { savePersonnel } from "./actions";

export type PersonnelFormData = {
  id: string;
  name: string;
  callsign: string;
  title: string;
  agency: string;
  phone: string;
  email: string;
};

export function PersonnelForm({ initial }: { initial?: PersonnelFormData }) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(savePersonnel, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-[1fr_110px] gap-3">
        <Field label="Name">
          <Input name="name" defaultValue={initial?.name} placeholder="Jordan Reyes" required />
        </Field>
        <Field label="Callsign">
          <Input name="callsign" defaultValue={initial?.callsign} placeholder="MED-3" className="data" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title">
          <Input name="title" defaultValue={initial?.title} placeholder="Paramedic" />
        </Field>
        <Field label="Agency">
          <Select name="agency" defaultValue={initial?.agency ?? appConfig.agencies[0]}>
            {appConfig.agencies.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <PhoneInput name="phone" defaultValue={initial?.phone} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={initial?.email} placeholder="jreyes@example.org" />
        </Field>
      </div>

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Add personnel"}
        </Button>
      </div>
    </form>
  );
}
