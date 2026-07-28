"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { createMission } from "./actions";

export function MissionCreateForm() {
  const { close } = useModal();
  // createMission redirects on success, so we only ever see errors here.
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(createMission, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Mission name">
        <Input name="name" placeholder="Warrant service — Main St" required autoFocus />
      </Field>

      <Field label="Tentative go-time (Eastern)">
        <Input name="goTime" type="datetime-local" className="data" />
      </Field>

      <Field label="Briefing notes">
        <Textarea name="briefing" placeholder="Anything the team should know going in…" />
      </Field>

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create mission"}
        </Button>
      </div>
    </form>
  );
}
