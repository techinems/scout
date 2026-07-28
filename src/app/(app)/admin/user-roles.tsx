"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { setUserRoles } from "./actions";

export function UserRolesForm({
  userId,
  allRoles,
  currentRoleIds,
}: {
  userId: string;
  allRoles: { id: string; name: string; description: string }[];
  currentRoleIds: string[];
}) {
  const { close } = useModal();
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRoleIds));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () =>
    startTransition(async () => {
      const res: ActionResult = await setUserRoles(userId, [...selected]);
      if (res.ok) close();
      else setError(res.error);
    });

  return (
    <div className="space-y-4">
      <ul className="space-y-1.5">
        {allRoles.map((role) => (
          <li key={role.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-(--radius-control) border border-edge px-3 py-2 transition-colors hover:border-edge-strong">
              <input
                type="checkbox"
                checked={selected.has(role.id)}
                onChange={() => toggle(role.id)}
                className="mt-0.5 size-4 accent-(--color-accent)"
              />
              <span>
                <span className="block text-sm font-medium">{role.name}</span>
                {role.description && <span className="block text-[12px] text-ink-faint">{role.description}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save roles"}
        </Button>
      </div>
    </div>
  );
}
