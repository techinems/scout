/**
 * The full permission vocabulary. Adding a permission here (plus a label)
 * makes it immediately assignable in the admin UI — no migration needed,
 * since RolePermission stores plain strings.
 */
export const PERMISSIONS = [
  "mission.view",
  "mission.edit",
  "facility.view",
  "facility.edit",
  "personnel.view",
  "personnel.edit",
  "vehicle.view",
  "vehicle.edit",
  "note.generate",
  "status.set",
  "status.configure",
  "admin.roles",
  "admin.users",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "mission.view": "View missions",
  "mission.edit": "Create & edit missions",
  "facility.view": "View facilities",
  "facility.edit": "Create & edit facilities",
  "personnel.view": "View personnel roster",
  "personnel.edit": "Create & edit personnel",
  "vehicle.view": "View vehicles",
  "vehicle.edit": "Create & edit vehicles",
  "note.generate": "Generate mission notes",
  "status.set": "Set crew status",
  "status.configure": "Manage crew status types",
  "admin.roles": "Manage roles & permissions",
  "admin.users": "Manage user role assignments",
};

/** Groups for rendering the admin UI checkboxes. */
export const PERMISSION_GROUPS: { name: string; permissions: Permission[] }[] = [
  { name: "Missions", permissions: ["mission.view", "mission.edit", "note.generate", "status.set"] },
  { name: "Facilities", permissions: ["facility.view", "facility.edit"] },
  { name: "Roster", permissions: ["personnel.view", "personnel.edit", "vehicle.view", "vehicle.edit"] },
  { name: "Administration", permissions: ["status.configure", "admin.roles", "admin.users"] },
];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];
