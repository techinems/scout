import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "info" | "good" | "warn" | "danger";

const tones: Record<Tone, { chip: string; dot: string }> = {
  neutral: { chip: "bg-surface-3 text-ink-muted", dot: "bg-ink-faint" },
  accent: { chip: "bg-accent-soft text-accent-bright", dot: "bg-accent" },
  info: { chip: "bg-info-soft text-info", dot: "bg-info" },
  good: { chip: "bg-good-soft text-good", dot: "bg-good" },
  warn: { chip: "bg-warn-soft text-warn", dot: "bg-warn" },
  danger: { chip: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export function Badge({
  tone = "neutral",
  dot = true,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        t.chip,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
