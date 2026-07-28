"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconTrash } from "@/components/icons";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { deleteStatusType, restoreStatusType, saveStatusType } from "./actions";

export type StatusTypeRow = {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  isActive: boolean;
  eventCount: number;
};

export function StatusTypeManager({ types }: { types: StatusTypeRow[] }) {
  const [editing, setEditing] = useState<StatusTypeRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-faint">
        Order matters: the one-tap “advance” button on missions walks this chain top to bottom.
      </p>
      <ul className="divide-y divide-edge rounded-(--radius-control) border border-edge">
        {types.map((t, i) => (
          <li key={t.id} className={`flex items-center gap-3 px-3 py-2 ${t.isActive ? "" : "opacity-45"}`}>
            <span className="data w-5 text-right text-[11px] text-ink-faint">{i + 1}</span>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="flex-1 text-sm">
              {t.name}
              {!t.isActive && <span className="ml-2 text-[11px] text-ink-faint">(retired)</span>}
            </span>
            <span className="data text-[11px] text-ink-faint">{t.shortCode}</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
              Edit
            </Button>
            {t.isActive ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                className="!text-ink-faint hover:!text-danger"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteStatusType(t.id);
                    setError(res.ok ? null : res.error);
                  })
                }
                aria-label={`Remove ${t.name}`}
                title={t.eventCount > 0 ? "Has history — will be retired, not deleted" : "Delete"}
              >
                <IconTrash />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => startTransition(async () => { await restoreStatusType(t.id); })}
              >
                Restore
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-[13px] text-danger">{error}</p>}

      {editing ? (
        <StatusTypeForm type={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          New status
        </Button>
      )}
    </div>
  );
}

function StatusTypeForm({ type, onDone }: { type: StatusTypeRow | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveStatusType, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3 rounded-(--radius-control) border border-edge bg-surface-2 p-3">
      {type && <input type="hidden" name="id" value={type.id} />}
      <div className="grid grid-cols-[1fr_110px_72px] gap-3">
        <Field label="Name">
          <Input name="name" defaultValue={type?.name} placeholder="On Scene" required />
        </Field>
        <Field label="Short code">
          <Input name="shortCode" defaultValue={type?.shortCode} placeholder="ONSCN" required className="data uppercase" />
        </Field>
        <Field label="Color">
          <input
            type="color"
            name="color"
            defaultValue={type?.color ?? "#4c8dff"}
            className="h-9 w-full cursor-pointer rounded-(--radius-control) border border-edge bg-surface-2"
          />
        </Field>
      </div>
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save status"}
        </Button>
      </div>
    </form>
  );
}
