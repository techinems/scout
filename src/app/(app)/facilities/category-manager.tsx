"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { IconTrash } from "@/components/icons";
import { deleteCategory, saveCategory, type ActionResult } from "./actions";

export type CategoryRow = {
  id: string;
  name: string;
  noteLabel: string;
  color: string;
  isSystem: boolean;
  isAeromedical: boolean;
  facilityCount: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-edge rounded-(--radius-control) border border-edge">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 text-sm">{c.name}</span>
            <span className="data text-[11px] text-ink-faint">{c.noteLabel}</span>
            <span className="text-[11px] text-ink-faint">{c.facilityCount}</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
              Edit
            </Button>
            {!c.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                className="!text-ink-faint hover:!text-danger"
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteCategory(c.id);
                    setError(res.ok ? null : res.error);
                  })
                }
                aria-label={`Delete ${c.name}`}
              >
                <IconTrash />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-[13px] text-danger">{error}</p>}

      {editing ? (
        <CategoryForm category={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          New category
        </Button>
      )}
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: CategoryRow | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveCategory, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3 rounded-(--radius-control) border border-edge bg-surface-2 p-3">
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="flex items-center gap-2 text-[13px] text-ink-muted">
        <input
          type="checkbox"
          name="isAeromedical"
          value="true"
          defaultChecked={category?.isAeromedical}
          className="size-3.5 accent-(--color-accent)"
        />
        Aeromedical — med plan estimates request→landing time for this category
      </label>
      <div className="grid grid-cols-[1fr_120px_72px] gap-3">
        <Field label="Name">
          <Input name="name" defaultValue={category?.name} placeholder="Burn Center" required />
        </Field>
        <Field label="Note label">
          <Input name="noteLabel" defaultValue={category?.noteLabel} placeholder="BURN" required className="data uppercase" />
        </Field>
        <Field label="Color">
          <input
            type="color"
            name="color"
            defaultValue={category?.color ?? "#4c8dff"}
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
          {pending ? "Saving…" : "Save category"}
        </Button>
      </div>
    </form>
  );
}

/** Wrapper so the manager can live in a Modal and close it from the header X. */
export function CategoryManagerModalBody({ categories }: { categories: CategoryRow[] }) {
  useModal(); // ensures we're inside a modal; close handled by Modal chrome
  return <CategoryManager categories={categories} />;
}
