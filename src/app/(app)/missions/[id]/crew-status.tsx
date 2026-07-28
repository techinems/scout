"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal, useModal } from "@/components/ui/modal";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { postCrewStatus, setCrewStatus } from "./status-actions";

export type StatusTypeOption = { id: string; name: string; shortCode: string; color: string };

/**
 * Current status chip (click → manual picker) plus a one-tap advance to the
 * next status in the configured chain.
 */
export function CrewStatusButton({
  missionId,
  crewId,
  crewName,
  statusTypes,
  current,
}: {
  missionId: string;
  crewId: string;
  crewName: string;
  statusTypes: StatusTypeOption[];
  current: { typeId: string; name: string; color: string; at: string } | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // statusTypes arrive sorted by chain order; next = the one after current.
  const currentIndex = current ? statusTypes.findIndex((t) => t.id === current.typeId) : -1;
  const next = currentIndex + 1 < statusTypes.length ? statusTypes[currentIndex + 1] : null;

  const advance = (typeId: string) =>
    startTransition(async () => {
      await postCrewStatus(missionId, crewId, typeId);
      router.refresh();
    });

  return (
    <span className="inline-flex items-center gap-1.5">
      <Modal
        title={`${crewName} — update status`}
        trigger={
          current ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-80"
              style={{ backgroundColor: `${current.color}26`, color: current.color }}
              title={`Since ${current.at} — click to pick a status manually`}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: current.color }} />
              {current.name}
              <span className="font-normal normal-case tracking-normal opacity-75">{current.at}</span>
            </button>
          ) : (
            <Button variant="ghost" size="sm">
              Set status
            </Button>
          )
        }
      >
        <CrewStatusForm missionId={missionId} crewId={crewId} statusTypes={statusTypes} />
      </Modal>

      {next && (
        <button
          disabled={pending}
          onClick={() => advance(next.id)}
          title={`Advance to ${next.name}`}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-40"
          style={{ borderColor: `${next.color}66`, color: next.color }}
        >
          → {pending ? "…" : next.name}
        </button>
      )}
    </span>
  );
}

function CrewStatusForm({
  missionId,
  crewId,
  statusTypes,
}: {
  missionId: string;
  crewId: string;
  statusTypes: StatusTypeOption[];
}) {
  const { close } = useModal();
  const [selected, setSelected] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(setCrewStatus, null);

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="missionId" value={missionId} />
      <input type="hidden" name="crewId" value={crewId} />
      {selected && <input type="hidden" name="statusTypeId" value={selected} />}

      <div className="grid grid-cols-2 gap-2">
        {statusTypes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className="flex items-center gap-2 rounded-(--radius-control) border px-3 py-2.5 text-left text-sm font-medium transition-colors"
            style={
              selected === t.id
                ? { borderColor: t.color, backgroundColor: `${t.color}1f`, color: t.color }
                : { borderColor: "var(--color-edge)", color: "var(--color-ink-muted)" }
            }
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
          </button>
        ))}
      </div>

      <Field label="Note (optional)">
        <Input name="note" placeholder="2 patients, code 3 to UMass…" maxLength={200} />
      </Field>

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !selected}>
          {pending ? "Posting…" : "Post status"}
        </Button>
      </div>
    </form>
  );
}
