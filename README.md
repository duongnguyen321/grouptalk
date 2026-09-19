# GroupTalk

Pass-the-phone party game: spin a wheel, draw a question card, answer out loud. Vietnamese only for v1.

Product source of truth: [GroupTalk.md](GroupTalk.md). System map: [ARCHITECTURE.md](ARCHITECTURE.md). Work tracking: [TODO.md](TODO.md).

## Current status

PLAN-001 through PLAN-003 are implemented: identity, Splash, Session Home, session setup, and the core play loop (wheel → winner confetti → 3 teaser cards → reveal + vote-hide). Join-by-code is still a lookup stub; history / contribute / session-code screens are placeholders until PLAN-004.

Next: [plans/PLAN-004-community-continuity.md](plans/PLAN-004-community-continuity.md).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · zustand · framer-motion · canvas-confetti · Prisma 7 + PostgreSQL · Redis · Auth.js v5 (Google, optional) · bun

## Setup

1. Copy env and fill Google keys only if you want OAuth:

```bash
cp .env.example .env
```

Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres (`127.0.0.1:5433` against Docker) |
| `REDIS_URL` | Redis (`127.0.0.1:6380` against Docker) |
| `AUTH_SECRET` | Auth.js secret |
| `AUTH_URL` | App origin (`http://localhost:3000`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth |

Google OAuth: use `http://localhost:3000` (not `127.0.0.1`). Authorized redirect URI in Google Cloud must be `http://localhost:3000/api/auth/callback/google`.

Host ports **5433 / 6380** avoid colliding with Homebrew Postgres/Redis on 5432/6379.

2. Start Docker services, migrate, seed:

```bash
docker compose up -d
bunx prisma migrate dev
bunx prisma db seed
```

Seed loads 6 topics and 16 system questions.

3. Run the app:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). **Chơi ngay** creates a guest `User` and stores `deviceId` in localStorage. Returning guests skip Splash.

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Next.js dev server |
| `bun run lint` | ESLint |
| `bun run db:generate` | Prisma client |
| `bun run db:migrate` | Prisma migrate |
| `bun run db:seed` | Topics + system questions |

## Features in this slice

- Guest play via `deviceId` (spoofable by design; accepted for v1)
- Optional Google sign-in (hidden until OAuth env is set)
- Session Home: "Tạo phiên mới" → category select; 8-digit join lookup
- Session setup wizard: multi-select categories, optional "thích thầm" for Nhóm bạn, player chips (min 2), persisted draft in localStorage until start
- `startGameSession` writes one `GameSession` and its `SessionPlayer` rows, then clears the draft
- Play loop: Redis-locked spin, silent ease-out wheel, confetti winner toast, 3 contributor teasers, immediate `SessionAnswer` on reveal, personal vote-hide + 30% global soft-delete

