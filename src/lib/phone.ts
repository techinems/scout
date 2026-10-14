/**
 * US phone formatting: (xxx) xxx-xxxx, with an optional " x123" extension.
 *
 * Only 10-digit numbers (optionally prefixed with a 1 country code) are
 * reformatted. Anything else (international numbers, short internal codes)
 * is returned trimmed but otherwise untouched, so it is never mangled.
 *
 * Pure and dependency-free: used by client inputs, server actions and the
 * seed script alike.
 */

const EXTENSION = /^(.*?)\s*(?:x|ext\.?|extension)\s*(\d+)\s*$/i;

function usDigits(text: string): string | null {
  let digits = text.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

function group(d: string): string {
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Normalize a complete phone number for storage and display. */
export function formatPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const ext = trimmed.match(EXTENSION);
  const main = ext ? ext[1] : trimmed;
  const digits = usDigits(main);
  if (!digits) return trimmed;
  return ext ? `${group(digits)} x${ext[2]}` : group(digits);
}

/**
 * Progressive formatting while typing: "(508", "(508) 555", "(508) 555-01".
 * Leaves the text alone once it stops looking like a plain US number
 * (a leading "+", letters such as an extension, or too many digits);
 * formatPhone tidies those up on blur and on save.
 */
export function formatPhoneAsTyped(value: string): string {
  if (/^\s*\+/.test(value) || /[a-z]/i.test(value)) return value;

  let digits = value.replace(/\D/g, "");
  // US area codes never start with 1, so a leading 1 is the country code.
  if (digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length === 0) return value.replace(/[^\d]/g, "") === "1" ? "1" : "";
  if (digits.length > 10) return value;

  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
