import type { MissionStatus } from "@/generated/prisma/enums";

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  DRAFT: "Draft",
  PLANNED: "Planned",
  ACTIVE: "Active",
  COMPLETE: "Complete",
  CANCELLED: "Cancelled",
};

export const MISSION_STATUS_TONE: Record<
  MissionStatus,
  "neutral" | "accent" | "info" | "good" | "warn" | "danger"
> = {
  DRAFT: "neutral",
  PLANNED: "info",
  ACTIVE: "accent",
  COMPLETE: "good",
  CANCELLED: "danger",
};

export const MISSION_STATUSES: MissionStatus[] = ["DRAFT", "PLANNED", "ACTIVE", "COMPLETE", "CANCELLED"];
