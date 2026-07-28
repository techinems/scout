/** Minimal class combiner — we don't need tailwind-merge's weight here. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
