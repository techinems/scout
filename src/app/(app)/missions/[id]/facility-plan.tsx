"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { IconCopy, IconRoute, IconShare } from "@/components/icons";
import { toHtml, toPlainText } from "@/lib/medplan/template";
import { copyRichText } from "@/lib/clipboard";
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
  const [copyError, setCopyError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const plain = note ? toPlainText(note) : null;

  const generate = () =>
    startTransition(async () => {
      setError(null);
      const res = await generateFacilityPlan(missionId);
      if (res.ok) setNote(res.content);
      else setError(res.error);
    });

  /**
   * Copy both flavors: text/html carries real <h1>/<h2> headings, which iOS
   * (Notes, Mail, …) maps onto its Title/Heading paragraph styles on paste;
   * text/plain is the fallback for plain-text targets. copyRichText walks a
   * compatibility chain (async clipboard → execCommand → plain writeText) so
   * it also works over plain http, where the modern clipboard API is
   * unavailable.
   */
  const copy = async () => {
    if (!note || !plain) return;
    setCopyError(null);
    const ok = await copyRichText(toHtml(note), plain);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setCopyError("Copy failed — your browser blocked clipboard access. Select the text and copy manually.");
    }
  };

  const share = async () => {
    if (!plain) return;
    setCopyError(null);
    if (navigator.share) {
      try {
        await navigator.share({ text: plain });
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
            it as a note for your phone. The layout is editable in Administration → Med plan template.
          </p>
        )}

        {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}

        {plain && (
          <>
            <pre className="data max-h-96 overflow-auto rounded-(--radius-control) border border-edge bg-bg p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
              {plain}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                <IconCopy /> {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={share}>
                <IconShare /> Share to Notes
              </Button>
            </div>
            {copyError && <p className="mt-2 text-[13px] text-danger">{copyError}</p>}
            <p className="mt-2 text-[11px] text-ink-faint">
              Copy keeps heading styles when pasting into iOS Notes; the share sheet sends plain text.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
