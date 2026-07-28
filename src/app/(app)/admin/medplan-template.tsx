"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/app/(app)/facilities/actions";
import { TEMPLATE_VARIABLES } from "@/lib/medplan/default-template";
import { resetMedplanTemplate, saveMedplanTemplate } from "./actions";

export function MedplanTemplateEditor({
  current,
  isCustomized,
}: {
  /** The template in effect right now (custom or default). */
  current: string;
  isCustomized: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveMedplanTemplate, null);
  const [resetting, startReset] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    if (!state?.ok) return;
    const show = setTimeout(() => setSaved(true), 0);
    const hide = setTimeout(() => setSaved(false), 2000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-[12px] text-ink-faint">
        {"{{variable}}"} inserts a value; {"{{#section}}…{{/section}}"} repeats for each item (or skips when
        empty). Lines starting with <span className="data"># </span> and <span className="data">## </span>{" "}
        become styled headings when the note is copied — iOS Notes keeps them as Title/Heading. **bold** works
        too.{" "}
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className="text-accent-bright underline-offset-2 hover:underline"
        >
          {showRef ? "Hide variables" : "Show all variables"}
        </button>
      </p>

      {showRef && (
        <div className="grid gap-3 rounded-(--radius-control) border border-edge bg-surface-2 p-3 sm:grid-cols-2">
          {TEMPLATE_VARIABLES.map((group) => (
            <div key={group.section}>
              <p className="data mb-1 text-[11px] font-semibold text-ink-muted">{group.section}</p>
              <ul className="space-y-0.5">
                {group.items.map((v) => (
                  <li key={v.name} className="text-[11px] text-ink-faint">
                    <span className="data text-ink-muted">{`{{${v.name}}}`}</span> — {v.doc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <textarea
        name="template"
        defaultValue={current}
        key={current}
        spellCheck={false}
        className="data min-h-72 w-full rounded-(--radius-control) border border-edge bg-bg p-3 text-[12px] leading-relaxed text-ink focus:border-edge-strong"
      />

      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-faint">
          {isCustomized ? "Using a customized template." : "Using the built-in default."}
        </span>
        <div className="flex gap-2">
          {isCustomized && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resetting}
              onClick={() => {
                if (confirm("Discard the custom template and restore the default?")) {
                  startReset(async () => {
                    await resetMedplanTemplate();
                  });
                }
              }}
            >
              Reset to default
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Validating…" : saved ? "Saved ✓" : "Save template"}
          </Button>
        </div>
      </div>
    </form>
  );
}
