import type { LocationKind } from "@/generated/prisma/enums";

export const LOCATION_KIND_LABEL: Record<LocationKind, string> = {
  MEET: "Meet",
  BRIEF: "Brief",
  STAGING: "Staging",
  TARGET: "Target",
  LZ: "LZ",
  OTHER: "Other",
};

export const LOCATION_KIND_TONE: Record<LocationKind, "neutral" | "accent" | "info" | "good" | "warn" | "danger"> = {
  MEET: "info",
  BRIEF: "good",
  STAGING: "warn",
  TARGET: "accent",
  LZ: "danger",
  OTHER: "neutral",
};

export const LOCATION_KINDS: LocationKind[] = ["MEET", "BRIEF", "STAGING", "TARGET", "LZ", "OTHER"];
