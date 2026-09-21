#!/usr/bin/env bash
#
# Release the standalone Next.js build onto a self-hosted VPS and reload the PM2 process.
#
# Prerequisites (installed on the server, not by this script):
#   - bun            https://bun.sh
#   - pm2            npm i -g pm2
#   - docker         https://docs.docker.com/get-docker/ (with Docker Compose)
#   - a populated .env.production in the app root (copy .env.production.example)
#
# Postgres and Redis containers are managed via Docker Compose. The app itself runs
# as a bare PM2 process. Run this from a checkout of the repo on the server.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

command -v bun >/dev/null 2>&1 || {
  echo "bun is required: https://bun.sh" >&2
  exit 1
}
command -v pm2 >/dev/null 2>&1 || {
  echo "pm2 is required: npm i -g pm2" >&2
  exit 1
}

# Detect Docker Compose CLI
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "docker compose is required: https://docs.docker.com/compose/" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker first." >&2
  exit 1
fi

wait_for_healthy() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local interval=2

  echo "Waiting for ${service} to become healthy..."
  while [ "$elapsed" -lt "$timeout" ]; do
    local container_id
    container_id="$($DOCKER_COMPOSE ps -q "$service" 2>/dev/null || true)"
    if [ -n "$container_id" ]; then
      local status
      status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [ "$status" = "healthy" ]; then
        echo "${service} is healthy."
        return 0
      elif [ "$status" = "unhealthy" ]; then
        echo "Error: ${service} reported unhealthy status." >&2
        return 1
      fi
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  echo "Error: Timed out waiting for ${service} to become healthy (${timeout}s)." >&2
  return 1
}

git pull --ff-only

# Start database and redis services and wait for health checks
echo "Ensuring Postgres and Redis containers are running..."
$DOCKER_COMPOSE up -d postgres redis

wait_for_healthy postgres 60
wait_for_healthy redis 30

# Ensure Bun is up-to-date (bun.lock requires lockfileVersion 2 from Bun 1.4+)
bun upgrade || true

# Full install (not --production): `next build` needs typescript, tailwindcss and the
# postcss plugin, which are devDependencies. The standalone output is self-contained,
# so nothing needs pruning afterwards.
bun install --frozen-lockfile || bun install

bunx prisma migrate deploy
bunx prisma generate

bun run build

# Next's standalone output excludes public/ and .next/static; server.js expects both
# to sit beside it. Copy contents (not the directories) so re-running stays idempotent.
mkdir -p .next/standalone/public .next/standalone/.next
cp -R public/. .next/standalone/public/
cp -R .next/static/. .next/standalone/.next/static/

pm2 reload ecosystem.config.js --update-env
pm2 save

echo "Released $(git rev-parse --short HEAD) — grouptalk reloaded."
