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
{{#crewSummary}}
Crew: {{crewSummary}}
{{/crewSummary}}

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
{{^isAero}}
  {{address}} · {{eta}}
{{/isAero}}
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

{{#comms}}
## Comms
{{comms}}
{{/comms}}

Generated {{generatedAt}} by {{generatedBy}}
`;

/** Variables documented for the admin editor. */
export const TEMPLATE_VARIABLES: { section: string; items: { name: string; doc: string }[] }[] = [
  {
    section: "Top level",
    items: [
      { name: "missionName", doc: "Mission name" },
      { name: "missionTown", doc: "Town parsed from the meet location (target as fallback)" },
      { name: "planTitle", doc: "Town, falling back to the mission name" },
      { name: "goDate", doc: 'Compact date, e.g. "28 Jul 26"' },
      { name: "goTime", doc: "Formatted go-time (with timezone)" },
      { name: "crewNames", doc: 'Crew names joined with "/", e.g. "Alpha/Bravo"' },
      {
        name: "crewSummary",
        doc: 'Member last names: one crew → "Smith/Greene"; several → "Alpha: Smith/Greene" per line',
      },
      { name: "targetAddress", doc: "Target location address" },
      { name: "comms", doc: "Comms/channels from mission settings (one per line)" },
      { name: "trafficNote", doc: '"drive from TGT @ go-time" or the straight-line fallback note' },
      { name: "generatedAt", doc: "Timestamp of generation" },
      { name: "generatedBy", doc: "Name of the generating user" },
      { name: "hasLocations / hasCrews / hasMedcon", doc: "Booleans for wrapping optional sections" },
      { name: "unassigned", doc: "Comma-separated personnel not in a crew" },
      { name: "looseVehicles", doc: "Vehicles not attached to a crew" },
    ],
  },
  {
    section: "{{#medcon}} … {{/medcon}} (assignments with a medical-control role/title)",
    items: [
      { name: "name", doc: "Physician name" },
      { name: "phone", doc: "Phone from the roster" },
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
      { name: "localEmsStagingEtaShort", doc: 'Just the time, e.g. "2 min"' },
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
      { name: "categoryName", doc: "Full category name (used as the section heading)" },
      { name: "categoryLabel", doc: "Category note label (TRAUMA, AIR, …)" },
      { name: "isAero", doc: "True on aeromedical rows — pair with {{^isAero}} for others" },
      { name: "name", doc: "Facility name" },
      { name: "extras", doc: '"Lvl I, helipad" style qualifiers' },
      { name: "address", doc: "Facility address" },
      { name: "eta", doc: "Drive time / distance (or straight-line)" },
      { name: "etaShort", doc: 'Just the time, e.g. "17 min"' },
      { name: "phone", doc: "Facility phone" },
      { name: "air", doc: "Aeromedical request→landing estimate (full breakdown)" },
      { name: "airMin", doc: 'Aeromedical estimate, short: "25 min"' },
      { name: "lzLabel", doc: "LZ label/address (aeromedical rows)" },
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
