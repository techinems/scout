"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { IconCopy, IconRoute, IconShare } from "@/components/icons";
import { generateFacilityPlan } from "./facility-actions";

export function FacilityPlan({
  missionId,
  target,
  goTime,
  canGenerate,
  latestNote,
}: {
  missionId: string;
  target: { label: string; address: string } | null;
  goTime: string | null;
  canGenerate: boolean;
  latestNote: { content: string; generatedAt: string } | null;
}) {
  const [note, setNote] = useState<string | null>(latestNote?.content ?? null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const res = await generateFacilityPlan(missionId);
      if (res.ok) setNote(res.content);
      else setError(res.error);
    });

  const copy = async () => {
    if (!note) return;
    await navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    if (!note) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: note });
      } catch {
        // user dismissed the sheet
      }
    } else {
      await copy();
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <IconRoute className="size-3.5" /> Med plan
          </span>
        }
        action={
          canGenerate && (
            <Button variant="ghost" size="sm" disabled={pending || !target} onClick={generate}>
              {pending ? "Computing…" : note ? "Regenerate" : "Generate"}
            </Button>
          )
        }
      />
      <div className="p-4">
        {!target && (
          <p className="text-[13px] text-ink-faint">
            Add a <span className="font-semibold text-accent-bright">target</span> location first —
            closest facilities are computed from it{goTime ? ", in traffic at go-time" : ""}.
          </p>
        )}

        {target && !note && !pending && (
          <p className="text-[13px] text-ink-faint">
            Computes the closest facility of each category from the target
            {goTime ? " with traffic at go-time" : ""}, estimates aeromedical response, and formats
            it as a note for your phone.
          </p>
        )}

        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}

        {note && (
          <>
            <pre className="data max-h-96 overflow-auto rounded-(--radius-control) border border-edge bg-bg p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
              {note}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                <IconCopy /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={share}>
                <IconShare /> Share to Notes
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
