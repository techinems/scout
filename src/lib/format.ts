import { appConfig } from "@/lib/app-config";

const TZ = appConfig.timezone;
// Display times only; datetime-local values and offset math stay 24h.
const HOUR12 = appConfig.clockFormat === "12h";

export function formatGoTime(date: Date | null): string {
  if (!date) return "Go-time TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: HOUR12,
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: HOUR12,
  }).format(date);
}

/** Compact military-style date, e.g. "28 Jul 26". */
export function formatGoDate(date: Date | null): string {
  if (!date) return "Date TBD";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** Short clock time, e.g. "14:32". */
export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: HOUR12,
  }).format(date);
}

/** For <input type="datetime-local"> defaultValue, in local wall time. */
export function toDatetimeLocalValue(date: Date | null): string {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Parse a datetime-local string ("YYYY-MM-DDTHH:mm") as wall time in the
 * configured timezone into a UTC Date. Two-pass offset resolution handles DST boundaries.
 */
export function parseLocalDateTime(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const wallUtc = Date.UTC(y, mo - 1, d, h, mi);
  let instant = wallUtc;
  for (let i = 0; i < 2; i++) {
    instant = wallUtc - tzOffsetMs(new Date(instant));
  }
  return new Date(instant);
}

function tzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - date.getTime();
}

export function minutesToHuman(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}

/** Distance in the configured units (DISTANCE_UNITS), e.g. "4.2 mi". */
export function formatDistance(meters: number): string {
  return appConfig.distanceUnits === "km"
    ? `${(meters / 1000).toFixed(1)} km`
    : `${(meters / 1609.344).toFixed(1)} mi`;
}

/** Short generic zone name for the configured timezone, e.g. "ET", "CT". */
export function timezoneShort(): string {
  return zoneName("shortGeneric") ?? TZ;
}

/** Long generic zone name, e.g. "Eastern Time". */
export function timezoneLong(): string {
  return zoneName("longGeneric") ?? TZ;
}

function zoneName(style: "shortGeneric" | "longGeneric"): string | null {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: style })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? null;
}

/**
 * Best-effort town extraction from a formatted US address like
 * "455 Main St, Worcester, MA 01608(, USA)". Returns "" when the address has
 * no recognizable state/ZIP component (freeform descriptions).
 */
export function townFromAddress(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length && /^(USA|United States)$/i.test(parts[parts.length - 1])) parts.pop();
  if (parts.length < 2) return "";
  const last = parts[parts.length - 1];
  // "MA 01608", "MA", or a bare ZIP mark the state component.
  if (/^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/.test(last) || /^\d{5}(-\d{4})?$/.test(last)) {
    return parts[parts.length - 2];
  }
  return "";
}

export { toDDM } from "@/lib/geo";
