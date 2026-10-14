/**
 * Deployment branding/config, baked in at build time from app.config.json
 * at the repo root. Edit that file (not this one) before building a private
 * image to localize the app for an agency.
 */
import raw from "../../app.config.json";

export type AppConfig = {
  appName: string;
  organization: string;
  unitLine: string;
  description: string;
  agencies: string[];
  timezone: string;
  /** Default map view for the LZ picker before a point is chosen. */
  mapCenter: { lat: number; lng: number; zoom: number };
  /**
   * Countries address autocomplete may suggest from (ISO 3166-1 alpha-2).
   * Suggestions are also biased toward mapCenter when its zoom is ≥ 8.
   */
  addressRegionCodes: string[];
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
  aeromedical: { launchMinutes: 10, cruiseSpeedKnots: 130, landingBufferMinutes: 3 },
  loginNotice: "Mission support portal. Access is restricted to credentialed team members.",
  footerNotice: "Authorized use only. Activity may be logged.",
};

export const appConfig: AppConfig = { ...defaults, ...(raw as Partial<AppConfig>) };
