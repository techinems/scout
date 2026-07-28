"use client";

import { useActionState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { IconTrash } from "@/components/icons";
import { PERMISSION_GROUPS, PERMISSION_LABELS, type Permission } from "@/lib/rbac/permissions";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { deleteRole, saveRole } from "./actions";

export type RoleData = {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
};

export function RoleForm({ initial }: { initial?: RoleData }) {
  const { close } = useModal();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveRole, null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-[180px_1fr] gap-3">
        <Field label="Role name">
          <Input name="name" defaultValue={initial?.name} placeholder="Team Lead" required disabled={initial?.isSystem} />
          {initial?.isSystem && <input type="hidden" name="name" value={initial.name} />}
        </Field>
        <Field label="Description">
          <Input name="description" defaultValue={initial?.description} placeholder="What this role is for" />
        </Field>
      </div>

      <div className="space-y-3">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.name} className="rounded-(--radius-control) border border-edge p-3">
            <legend className="kicker px-1">{group.name}</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.permissions.map((p: Permission) => (
                <label key={p} className="flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={p}
                    defaultChecked={initial?.permissions.includes(p)}
                    className="size-3.5 accent-(--color-accent)"
                  />
                  {PERMISSION_LABELS[p]}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex items-center justify-between pt-1">
        {initial && !initial.isSystem ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={deleting}
            onClick={() => {
              if (confirm(`Delete role "${initial.name}"? Users holding it lose its permissions.`)) {
                startDelete(async () => {
                  await deleteRole(initial.id);
                  close();
                });
              }
            }}
          >
            <IconTrash /> Delete role
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : initial ? "Save role" : "Create role"}
          </Button>
        </div>
      </div>
    </form>
  );
}
