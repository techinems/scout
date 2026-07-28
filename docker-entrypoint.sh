#!/bin/sh
# Apply pending migrations and the idempotent baseline seed (roles, facility
# categories, crew status chain — demo data only when SEED_DEMO_DATA=true),
# then start the standalone Next.js server.
set -e

echo "[scout] applying migrations…"
npx prisma migrate deploy

echo "[scout] running baseline seed…"
npx tsx prisma/seed.ts

echo "[scout] starting server…"
exec node server.js
