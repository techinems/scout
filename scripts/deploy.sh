#!/usr/bin/env bash
# Build the Scout image for linux/amd64, push it to GHCR, and trigger a
# Coolify redeploy. Reads scripts/secrets.env (see secrets.env.example).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS="$ROOT/scripts/secrets.env"

if [[ ! -f "$SECRETS" ]]; then
  echo "error: $SECRETS not found — copy scripts/secrets.env.example and fill it in" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$SECRETS"

: "${IMAGE:?IMAGE must be set in secrets.env}"
: "${COOLIFY_URL:?COOLIFY_URL must be set in secrets.env}"
: "${COOLIFY_API_TOKEN:?COOLIFY_API_TOKEN must be set in secrets.env}"
: "${COOLIFY_RESOURCE_UUID:?COOLIFY_RESOURCE_UUID must be set in secrets.env}"

# ── GHCR auth ───────────────────────────────────────────────────────
GHCR_USER="${GHCR_USER:-$(gh api user --jq .login)}"
TOKEN="${GHCR_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  if ! gh auth status 2>&1 | grep -q "write:packages"; then
    cat >&2 <<'EOF'
error: your gh token lacks the write:packages scope and GHCR_TOKEN is empty.
Fix with either:
  gh auth refresh -h github.com -s write:packages,read:packages
or set GHCR_TOKEN in scripts/secrets.env to a PAT with write:packages.
EOF
    exit 1
  fi
  TOKEN="$(gh auth token)"
fi
echo "$TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# ── Build & push ────────────────────────────────────────────────────
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
echo "==> building $IMAGE:{latest,$SHA} for linux/amd64"
docker buildx build \
  --platform linux/amd64 \
  --tag "$IMAGE:latest" \
  --tag "$IMAGE:$SHA" \
  --push \
  "$ROOT"

# ── Trigger Coolify redeploy ────────────────────────────────────────
echo "==> triggering Coolify redeploy of $COOLIFY_RESOURCE_UUID"
HTTP_CODE="$(curl -sS -o /tmp/coolify-deploy.json -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$COOLIFY_URL/api/v1/deploy?uuid=$COOLIFY_RESOURCE_UUID")"

if [[ "$HTTP_CODE" != 2* ]]; then
  echo "error: Coolify deploy API returned HTTP $HTTP_CODE" >&2
  cat /tmp/coolify-deploy.json >&2
  exit 1
fi

echo "==> done — deployed $IMAGE:$SHA"
cat /tmp/coolify-deploy.json
echo
