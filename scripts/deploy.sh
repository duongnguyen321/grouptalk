#!/usr/bin/env bash
#
# Release the standalone Next.js build onto a self-hosted VPS and reload the PM2 process.
#
# Prerequisites (installed on the server, not by this script):
#   - bun            https://bun.sh
#   - pm2            npm i -g pm2
#   - a populated .env.production in the app root (copy .env.production.example)
#
# Postgres and Redis are managed separately from the app process. Run this from a
# checkout of the repo on the server.

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

git pull --ff-only

# Full install (not --production): `next build` needs typescript, tailwindcss and the
# postcss plugin, which are devDependencies. The standalone output is self-contained,
# so nothing needs pruning afterwards.
bun install --frozen-lockfile

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
