/**
 * The built-in med plan template. Admins can override it from
 * Administration → Med plan template; "Reset to default" restores this.
 * Variable reference lives alongside the editor in the admin UI.
 */
export const MEDPLAN_TEMPLATE_KEY = "medplan.template";

export const DEFAULT_MEDPLAN_TEMPLATE = `# Med Plan — {{missionName}}
{{#missionTown}}
Town: {{missionTown}}
{{/missionTown}}
Go-time: {{goTime}}

{{#hasLocations}}
## Locations
{{#locations}}
{{kindLabel}}: {{#label}}{{label}} — {{/label}}{{address}}
{{#ddm}}
  {{ddm}}
{{/ddm}}
{{/locations}}
{{/hasLocations}}

## Closest Facilities ({{trafficNote}})
{{#facilities}}
**{{categoryLabel}}**: {{name}}{{#extras}} ({{extras}}){{/extras}}
  {{address}} · {{eta}}
{{#phone}}
  {{phone}}
{{/phone}}
{{#air}}
  Est request→landing: {{air}}
{{/air}}
{{#lzCoords}}
  LZ coords: {{lzCoords}}
{{/lzCoords}}
{{/facilities}}

{{#hasLocalEms}}
## Local EMS
{{#localEmsName}}
Service: {{localEmsName}}
{{/localEmsName}}
{{#localEmsDispatchPhone}}
Dispatch: {{localEmsDispatchPhone}}
{{/localEmsDispatchPhone}}
{{#localEmsPocName}}
POC: {{localEmsPocName}}{{#localEmsPocPhone}} · {{localEmsPocPhone}}{{/localEmsPocPhone}}
{{/localEmsPocName}}
{{#localEmsStaging}}
Staging: {{localEmsStaging}}{{#localEmsStagingEta}} · {{localEmsStagingEta}}{{/localEmsStagingEta}}
{{/localEmsStaging}}
{{/hasLocalEms}}

{{#hasCrews}}
## Crews
{{#crews}}
{{name}}{{#vehicle}} — {{vehicle}}{{/vehicle}}: {{members}}
{{/crews}}
{{#unassigned}}
Unassigned: {{unassigned}}
{{/unassigned}}
{{#looseVehicles}}
Vehicles: {{looseVehicles}}
{{/looseVehicles}}
{{/hasCrews}}

Generated {{generatedAt}} by {{generatedBy}}
`;

/** Variables documented for the admin editor. */
export const TEMPLATE_VARIABLES: { section: string; items: { name: string; doc: string }[] }[] = [
  {
    section: "Top level",
    items: [
      { name: "missionName", doc: "Mission name" },
      { name: "missionTown", doc: "Town parsed from the meet location (target as fallback)" },
      { name: "goTime", doc: "Formatted go-time (with timezone)" },
      { name: "trafficNote", doc: '"drive from TGT @ go-time" or the straight-line fallback note' },
      { name: "generatedAt", doc: "Timestamp of generation" },
      { name: "generatedBy", doc: "Name of the generating user" },
      { name: "hasLocations / hasCrews", doc: "Booleans for wrapping optional sections" },
      { name: "unassigned", doc: "Comma-separated personnel not in a crew" },
      { name: "looseVehicles", doc: "Vehicles not attached to a crew" },
    ],
  },
  {
    section: "Local EMS (wrap in {{#hasLocalEms}} … {{/hasLocalEms}})",
    items: [
      { name: "localEmsName", doc: "Local EMS service name" },
      { name: "localEmsDispatchPhone", doc: "Dispatch phone number" },
      { name: "localEmsPocName", doc: "Point of contact name" },
      { name: "localEmsPocPhone", doc: "Point of contact phone" },
      { name: "localEmsStaging", doc: "Staging location address" },
      { name: "localEmsStagingEta", doc: "Drive time from staging to target (at go-time)" },
    ],
  },
  {
    section: "{{#locations}} … {{/locations}}",
    items: [
      { name: "kindLabel", doc: "MEET / BRIEF / STAGE / TGT / LZ / LOC" },
      { name: "label", doc: "Optional location label" },
      { name: "address", doc: "Address or description" },
      { name: "ddm", doc: "Degrees decimal minutes (LZs only)" },
      { name: "notes", doc: "Location notes" },
    ],
  },
  {
    section: "{{#facilities}} … {{/facilities}} (closest per category)",
    items: [
      { name: "categoryLabel", doc: "Category note label (TRAUMA, AIR, …)" },
      { name: "name", doc: "Facility name" },
      { name: "extras", doc: '"Lvl I, helipad" style qualifiers' },
      { name: "address", doc: "Facility address" },
      { name: "eta", doc: "Drive time / distance (or straight-line)" },
      { name: "phone", doc: "Facility phone" },
      { name: "air", doc: "Aeromedical request→landing estimate" },
      { name: "lzCoords", doc: "DDM coords of the LZ (aeromedical rows)" },
    ],
  },
  {
    section: "{{#crews}} … {{/crews}}",
    items: [
      { name: "name", doc: "Crew name" },
      { name: "vehicle", doc: "Assigned vehicle designator" },
      { name: "members", doc: "Formatted member list with callsigns/roles" },
    ],
  },
];
