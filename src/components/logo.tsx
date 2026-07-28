import { cn } from "@/lib/cn";
import { appConfig } from "@/lib/app-config";

/** Compass-chevron mark: an upward chevron inside a reticle. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-8", className)} aria-hidden>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M16 1v5M16 26v5M1 16h5M26 16h5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M9.5 20.5 16 9l6.5 11.5-6.5-3.2-6.5 3.2Z" fill="var(--color-accent)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="text-ink-muted" />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[0.22em] uppercase">{appConfig.appName}</span>
        <span className="mt-1 text-[9px] font-medium tracking-[0.18em] text-ink-faint uppercase">
          {appConfig.unitLine}
        </span>
      </span>
    </span>
  );
}
