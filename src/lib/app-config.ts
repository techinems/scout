/**
 * Deployment config, read from environment variables at runtime so a single
 * image can be configured per deployment (e.g. in Coolify). Every variable is
 * optional; unset ones fall back to the generic defaults below. See
 * .env.example for the full list.
 *
 * Server-only: client components receive the values they need as props.
 */
import "server-only";

export type AddressBias = {
  south: number;
  west: number;
  north: number;
  east: number;
  /** true = only suggest addresses inside the box; false = rank them first. */
  restrict: boolean;
};

export type AppConfig = {
  appName: string;
  organization: string;
  unitLine: string;
  description: string;
  agencies: string[];
  timezone: string;
  /** Default map view for the LZ picker before a point is chosen. */
  mapCenter: { lat: number; lng: number; zoom: number };
  /** Countries address autocomplete may suggest from (ISO 3166-1 alpha-2). */
  addressRegionCodes: string[];
  /**
   * Optional lat/lng box (e.g. around a state) that address suggestions are
   * biased toward or restricted to. When unset, suggestions are biased to a
   * 50 km circle around mapCenter if its zoom is ≥ 8.
   */
  addressBias: AddressBias | null;
  /** Assumptions behind the med plan's request→landing estimate. */
  aeromedical: { launchMinutes: number; cruiseSpeedKnots: number; landingBufferMinutes: number };
  loginNotice: string;
  footerNotice: string;
};

const defaults: AppConfig = {
  appName: "Scout",
  organization: "Tactical EMS Unit",
  unitLine: "TEMS Mission Support",
  description: "Mission support portal for tactical EMS teams",
  agencies: ["EMS", "Police", "Other"],
  timezone: "America/New_York",
  mapCenter: { lat: 39.83, lng: -98.58, zoom: 4 },
  addressRegionCodes: ["us"],
  addressBias: null,
  aeromedical: { launchMinutes: 10, cruiseSpeedKnots: 130, landingBufferMinutes: 3 },
  loginNotice: "Mission support portal. Access is restricted to credentialed team members.",
  footerNotice: "Authorized use only. Activity may be logged.",
};

function raw(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function str(name: string, fallback: string): string {
  return raw(name) ?? fallback;
}

function list(name: string, fallback: string[]): string[] {
  const value = raw(name);
  if (!value) return fallback;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function num(name: string, fallback: number): number {
  const value = raw(name);
  if (value === undefined) return fallback;
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  console.warn(`[config] ${name} is not a number ("${value}"); using ${fallback}`);
  return fallback;
}

/** Comma-separated numbers, e.g. "42.27,-71.80,9". Null when unset or malformed. */
function numbers(name: string, count: number): number[] | null {
  const value = raw(name);
  if (value === undefined) return null;
  const parts = value.split(",").map((s) => Number(s.trim()));
  if (parts.length === count && parts.every(Number.isFinite)) return parts;
  console.warn(`[config] ${name} must be ${count} comma-separated numbers ("${value}"); ignoring it`);
  return null;
}

function bool(name: string, fallback: boolean): boolean {
  const value = raw(name)?.toLowerCase();
  if (value === undefined) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function load(): AppConfig {
  const center = numbers("MAP_CENTER", 3);

  let addressBias: AddressBias | null = null;
  const box = numbers("ADDRESS_BIAS", 4);
  if (box) {
    const [south, west, north, east] = box;
    if (south < north && west < east) {
      addressBias = { south, west, north, east, restrict: bool("ADDRESS_BIAS_RESTRICT", false) };
    } else {
      console.warn("[config] ADDRESS_BIAS must be south,west,north,east with south < north and west < east; ignoring it");
    }
  }

  return {
    appName: str("APP_NAME", defaults.appName),
    organization: str("APP_ORGANIZATION", defaults.organization),
    unitLine: str("APP_UNIT_LINE", defaults.unitLine),
    description: str("APP_DESCRIPTION", defaults.description),
    agencies: list("APP_AGENCIES", defaults.agencies),
    timezone: str("APP_TIMEZONE", defaults.timezone),
    mapCenter: center ? { lat: center[0], lng: center[1], zoom: center[2] } : defaults.mapCenter,
    addressRegionCodes: list("ADDRESS_REGION_CODES", defaults.addressRegionCodes).map((c) => c.toLowerCase()),
    addressBias,
    aeromedical: {
      launchMinutes: num("AERO_LAUNCH_MINUTES", defaults.aeromedical.launchMinutes),
      cruiseSpeedKnots: num("AERO_CRUISE_KNOTS", defaults.aeromedical.cruiseSpeedKnots),
      landingBufferMinutes: num("AERO_LANDING_BUFFER_MINUTES", defaults.aeromedical.landingBufferMinutes),
    },
    loginNotice: str("APP_LOGIN_NOTICE", defaults.loginNotice),
    footerNotice: str("APP_FOOTER_NOTICE", defaults.footerNotice),
  };
}

export const appConfig: AppConfig = load();
