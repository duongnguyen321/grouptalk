# GroupTalk

Pass-the-phone party game: spin a wheel, draw a question card, answer out loud. Vietnamese only for v1.

Product source of truth: [GroupTalk.md](GroupTalk.md). System map: [ARCHITECTURE.md](ARCHITECTURE.md). Work tracking: [TODO.md](TODO.md).

## Current status

PLAN-001 through PLAN-012 are implemented: identity, Splash, Session Home (with recent sessions list & community overview stats), session setup, the core play loop (wheel → winner confetti → 3 teaser cards → reveal + vote-hide), community continuity (session-code copy, question contribution, session history), concurrency hardening (per-session Redis spin lock with atomic compare-and-delete release), §7 design system, full UX overhaul, secret priority spin configuration, crush boost teaser cards, author session access control, question library explorer (/questions) with topic chips filtering and infinite scroll, AI-generated brand icons (apple-icon, favicon.ico, PWA icons), and full-route SEO optimization for production domain `https://grouptalk.t5edu.site`.

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
- Session copy by 8-digit code: entering a code snapshots players + answer history into a brand-new `GameSession` (`copiedFromSessionId`); the source session keeps working and the code can be reused
- Contribute questions (title, categories with "Nhóm bạn" → automatic Nhóm nam/nữ tagging, topic, type, one-time guest nickname) — inserted straight into the pool, no moderation
- Session history list of every answered card, flagging questions that were globally removed
- Concurrency: `withSessionLock` guards the spin per `sessionId` (`SET NX PX 5000` + owner token, released by one atomic Lua compare-and-delete). Contention fails fast as `error: "busy"` and the play screen toasts "Đang xử lý, vui lòng thử lại" instead of blocking. Vote/reveal rely on DB unique constraints rather than a lock
- §7.6 design system: one definition per category colour/gradient/glow in `app/globals.css` (`--cat-*`, `--grad-*`, `--cat-*-glow`), surfaced as `bg-grad-*` utilities and the `text-name` / `text-question` / `text-note` / `text-credit` scale. Gradients render on the category-select cards, the wheel's SVG segments (via `<linearGradient>` defs) and the card backs
- Mobile pass: cards sized to ~84vw on small screens, ≥44px tap targets, and `env(safe-area-inset-bottom)` on the toast, play footer, menu drawer and setup buttons
- No audio anywhere (explicit non-goal) — `navigator.vibrate` haptics on the winner reveal is the only feedback
- UX overhaul (PLAN-007): top-level `/contribute` route with optional `?back=<sessionId>`, `BackHeader` navigation bar across all sub-screens, exit session confirmation dialog, recent sessions quick-rejoin on Home, collapsible player chip list mid-game, Lucide icons across UI (zero emojis), and OTP-style digit grouping
- Priority spin (PLAN-008): hidden host configuration via 700ms long-press on the session code chip, 3-dot weight selector (1x, 2x, 3x, 5x) in a bottom drawer, server-side weighted random selection, DB persistence on `GameSession.priorityConfig`, and remapping on session copy
- Crush boost questions (PLAN-009): when 'Thích thầm' is enabled, teaser card selection guarantees 1 emotional question ('Thích thầm' / 'Tình cảm' with fallback to 'Kỷ niệm') plus 2 topic-weighted questions (3x for romantic topics, 2x for memories), with random disguise shuffling and zero regression when disabled
- Author access control (PLAN-010): strict session ownership protection with cookie-synced guest deviceId and unauthorized redirect banners
- Question stats & explorer (PLAN-011): real-time question and SessionPlayer participation counters on Splash and Session Home, and an interactive `/questions` library with horizontal topic filters, question type badges, category tags, and 20-item infinite scroll

## Production deploy

Bare Node process under PM2; Postgres and Redis services are managed via Docker Compose.

1. On the server: install `bun`, `pm2`, and `docker` (with Docker Compose), then clone the repo.
2. `cp .env.production.example .env.production` and fill it in.
3. Run `./scripts/deploy.sh`. It pulls, starts and verifies health of Postgres and Redis containers via Docker Compose, runs `prisma migrate deploy` + `generate`, builds the standalone output, copies `public/` and `.next/static` in beside `server.js`, then `pm2 reload`s.

The PM2 app listens on port **30300** (configurable via `PORT` in `.env.production`); put a reverse proxy (nginx/Caddy) in front for TLS. `pm2 startup && pm2 save` once, so the app survives a reboot.

