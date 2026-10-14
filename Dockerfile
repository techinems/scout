# syntax=docker/dockerfile:1

# ── deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder envs so config validation passes at build time; real values
# come from the runtime environment.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate && npm run build

# ── runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S scout && adduser -S scout -G scout

# Standalone server + assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migration & seed tooling (full node_modules so `prisma migrate deploy`
# and the idempotent baseline seed can run in the entrypoint).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/app.config.json ./app.config.json
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/lib/rbac ./src/lib/rbac
COPY --from=builder /app/src/lib/phone.ts ./src/lib/phone.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R scout:scout /app

USER scout
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
