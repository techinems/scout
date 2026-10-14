# Scout

Mission support portal for tactical EMS (TEMS) teams: mission planning
(meet/brief/staging/target locations, crews, personnel, vehicles), a facility
directory (trauma centers, hospitals, vet hospitals, aeromedical bases, …),
crew status tracking with push notifications, and a one-tap **med plan** — the
closest facility of every category from the target, traffic-aware at go-time,
with aeromedical request→landing estimates and DDM landing-zone coordinates,
formatted as a note a team member can save to their phone.

Built with Next.js (App Router), Prisma 7 + PostgreSQL, and Tailwind v4.

## Local development

```bash
cp .env.example .env          # defaults work out of the box
docker compose up -d          # local Postgres on :5434
npm ci
npx prisma migrate deploy
SEED_DEMO_DATA=true npx tsx prisma/seed.ts
npm run dev
```

With `AUTH_DISABLED="true"` in `.env` you are signed in as a synthetic admin —
no Keycloak needed. Without a `GOOGLE_MAPS_API_KEY`, geocoding falls back to
manual coordinate entry, address fields lose autocomplete (they stay plain
text inputs), and the med plan uses clearly-labeled straight-line distances.

The server key needs the **Geocoding API**, **Routes API** and **Places API
(New)** enabled; the browser key (LZ map picker) needs the **Maps JavaScript
API**.

## Branding / localization

Every agency-specific setting (app name, unit line, agencies, timezone, map
center, address lookup region, aeromedical response assumptions) is an
optional environment variable read at runtime, so the same image works for any
deployment: set them in Coolify (or `.env` locally) and restart. Unset
variables fall back to generic defaults. `.env.example` lists them all.

For example, to bias address suggestions toward Massachusetts and open the LZ
map over Worcester:

```bash
MAP_CENTER="42.27,-71.80,9"                    # lat,lng,zoom
ADDRESS_BIAS="41.18,-73.51,42.89,-69.86"       # south,west,north,east
ADDRESS_BIAS_RESTRICT="false"
```

`ADDRESS_BIAS` ranks addresses inside the box first; set
`ADDRESS_BIAS_RESTRICT="true"` to suggest only addresses inside it. Malformed
values are ignored with a warning in the server log.

## Authentication & authorization

- **Authentication**: OIDC against Keycloak (`KEYCLOAK_ISSUER` discovery URL).
  Only accounts holding the `KEYCLOAK_REQUIRED_ROLE` realm role
  (default `scout-access`) can enter.
- **Authorization**: roles and 1-to-N permissions live in Scout's own
  database, managed from **Administration** in the app. Emails listed in
  `ADMIN_EMAILS` receive the Administrator role on first login.
- `AUTH_DISABLED=true` bypasses everything for local development only.

Keycloak client settings: confidential client, standard flow, redirect URI
`{APP_URL}/api/auth/callback`, post-logout redirect `{APP_URL}/login`.

## Push notifications

Crew status changes notify everyone assigned to the mission via Web Push.
Generate VAPID keys once (`npx web-push generate-vapid-keys`), set the env
vars, and each user opts in per-device with the bell in the sidebar. On iOS
(16.4+) the app must be added to the home screen first. Roster entries are
linked to login accounts by email; that link routes the notifications.

## Deployment

```bash
cp scripts/secrets.env.example scripts/secrets.env   # fill in
./scripts/deploy.sh
```

The script builds a linux/amd64 image, pushes `latest` + git-SHA tags to
GHCR, and triggers a Coolify redeploy via its API. The container applies
migrations and the idempotent baseline seed on boot, then starts the
standalone server. Configure the runtime env (`.env.example` names every
variable) in Coolify.

## License

MIT © Tech in EMS, Inc.
