# PLAN-001 — Foundation, Data Model, Auth & Splash/Session-Home

Source: [GroupTalk.md](../GroupTalk.md) §3, §4, §5.1, §5.2, §6.5 · Tracks: [TODO.md](../TODO.md) Phase 0–4

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| Auth library | NextAuth.js (Auth.js) v5 with Google provider + Prisma adapter |
| Local infra | `docker-compose.yml` for Postgres + Redis (dev only) |
| ORM | Prisma with driver adapters (`@prisma/adapter-pg`, edge-ready client) |
| sessionCode (8-digit) | Redis `INCR` atomic counter → zero-padded/base-encoded to 8 digits, persisted on `GameSession` |
| deviceId | `crypto.randomUUID()` generated client-side, stored in `localStorage` only, sent explicitly as a header/body field on requests |
| deviceId spoofing risk | **Accepted for v1** — guest identity is low-sensitivity by PRD scope (§3). Documented as known limitation, not fixed now. |
| Plan scope | Phase 0 (Foundation) → Phase 1 (Data Model) → Phase 2 (Auth/Identity) → Phase 3 (Splash/Login) → Phase 4 (Session Home) |

---

## Brief Task List

1. Scaffold infra: `docker-compose.yml`, `.env.example`, install deps (Prisma, adapters, ioredis, next-auth, @auth/prisma-adapter)
2. Write `prisma/schema.prisma` (all 7 models from PRD §4) + seed script for `Topic` + system `Question`s
3. Run initial migration, generate client
4. Build `lib/db.ts` (Prisma singleton w/ driver adapter) and `lib/redis.ts` (ioredis singleton)
5. Build `lib/session-code.ts` (Redis `INCR`-backed 8-digit code generator)
6. Build `lib/device.ts` (client-side guest deviceId create/read) + `lib/identity.ts` (server-side resolve/create `User` from deviceId or Google session)
7. Configure NextAuth (`lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`) with Google provider + Prisma adapter, wired to `User` model
8. Add Tailwind design tokens (Baloo 2 font, 4 category gradients) to `app/layout.tsx` / `app/globals.css`
9. Build Splash screen (`app/page.tsx`): logo/tagline, "Chơi ngay" / "Đăng nhập với Google", auto-skip if identity exists
10. Build Session Home (`app/session/page.tsx`): "Tạo phiên mới" / "Nhập mã để tiếp tục phiên" (code join wired to §6.5 copy-session stub for later phases)

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [docker-compose.yml](../docker-compose.yml) | create |
| 2 | [.env.example](../.env.example) | create |
| 3 | [package.json](../package.json) | modify (deps) |
| 4 | [prisma/schema.prisma](../prisma/schema.prisma) | create |
| 5 | [prisma/seed.ts](../prisma/seed.ts) | create |
| 6 | [lib/db.ts](../lib/db.ts) | create |
| 7 | [lib/redis.ts](../lib/redis.ts) | create |
| 8 | [lib/session-code.ts](../lib/session-code.ts) | create |
| 9 | [lib/device.ts](../lib/device.ts) | create |
| 10 | [lib/identity.ts](../lib/identity.ts) | create |
| 11 | [lib/auth.ts](../lib/auth.ts) | create |
| 12 | [app/api/auth/[...nextauth]/route.ts](../app/api/auth/%5B...nextauth%5D/route.ts) | create |
| 13 | [app/globals.css](../app/globals.css) | modify (font, category color tokens) |
| 14 | [app/layout.tsx](../app/layout.tsx) | modify (font, SessionProvider) |
| 15 | [app/page.tsx](../app/page.tsx) | modify → Splash screen |
| 16 | [app/session/page.tsx](../app/session/page.tsx) | create → Session Home |
| 17 | [app/session/actions.ts](../app/session/actions.ts) | create → `createSessionDraft`, `joinSessionByCode` Server Actions |

---

## Technical Logic (per file)

**`docker-compose.yml`** — services `postgres:16` (port 5432, volume) and `redis:7` (port 6379). No app service (Next dev runs on host).

**`.env.example`** — `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.

**`prisma/schema.prisma`** — models per PRD §4.1, mapped 1:1:
- `User(id, authType: AuthType enum[device|google], deviceId String? @unique, googleId String? @unique, displayName String?, createdAt)`
- `GameSession(id, sessionCode String @unique, ownerUserId, copiedFromSessionId String?, categories Category[] (enum array), crushQuestionEnabled Boolean, createdAt, lastActiveAt)`
- `SessionPlayer(id, sessionId, displayName)`
- `Topic(id, name)`
- `Question(id, title, type QuestionType enum, topicId, categories Category[], contributedByUserId String?, isDeleted Boolean @default(false), createdAt)`
- `SessionAnswer(id, sessionId, sessionPlayerId, questionId, answeredAt, @@unique([sessionId, sessionPlayerId, questionId]))`
- `QuestionVote(id, userId, questionId, createdAt, @@unique([userId, questionId]))`
- `Category` enum: `COUPLE | GIRLS | BOYS | FRIENDS`
- Generator uses `previewFeatures = ["driverAdapters"]`.

**`prisma/seed.ts`** — inserts hardcoded `Topic` rows + baseline system `Question`s per category (no `contributedByUserId` → resolves to "Ẩn danh" downstream).

**`lib/db.ts`** — `PrismaClient` singleton using `@prisma/adapter-pg` + `pg.Pool` from `DATABASE_URL`, cached on `globalThis` in dev to avoid connection storms on HMR.

**`lib/redis.ts`** — `ioredis` singleton from `REDIS_URL`, cached on `globalThis` in dev.

**`lib/session-code.ts`**
```ts
// Atomic, collision-free 8-digit code from a Redis counter
export async function nextSessionCode(): Promise<string> {
  // INCR "session:code:seq" in Redis
  // encode counter to fixed 8-digit numeric string (zero-padded)
  // caller retries with next INCR if Prisma unique constraint on sessionCode still collides (defensive only)
}
```

**`lib/device.ts`** (client-only module)
```ts
const DEVICE_ID_KEY = "grouptalk_device_id";
export function getOrCreateDeviceId(): string {
  // read localStorage[DEVICE_ID_KEY]; if absent, crypto.randomUUID() and store
}
```

**`lib/identity.ts`** (server-side)
```ts
// Resolve or create a User row for the guest deviceId (spoofable by design — accepted risk, v1)
export async function resolveGuestUser(deviceId: string): Promise<User> { }

// Resolve or create a User row from an authenticated NextAuth session (Google)
export async function resolveGoogleUser(googleId: string, displayName: string): Promise<User> { }

// Single entrypoint used by Server Actions/Route Handlers to get "who is calling"
export async function getCurrentUser(input: { deviceId?: string }): Promise<User> { }
```

**`lib/auth.ts`** — NextAuth v5 config: Google provider, `PrismaAdapter(prisma)`, `session.strategy = "database"`, callback to set `displayName` from Google profile on first sign-in.

**`app/api/auth/[...nextauth]/route.ts`** — re-exports `GET`/`POST` handlers from `lib/auth.ts`.

**`app/globals.css`** — `@font-face`/`next/font` Baloo 2 registration, CSS custom properties for the 4 category gradients (§7.6 hex values), base neutral background tokens.

**`app/layout.tsx`** — wraps children in `SessionProvider` (NextAuth client provider), applies Baloo 2 font class to `<body>`.

**`app/page.tsx`** — Splash screen. Server Component checks NextAuth session; Client Component checks `localStorage` deviceId on mount. If either exists → `redirect("/session")`. Otherwise renders logo/tagline + two CTAs.

**`app/session/page.tsx`** — Session Home. Two large CTAs: "Tạo phiên mới" (routes to future Phase 5 category screen — stub link for now) and "Nhập mã để tiếp tục phiên" (8-digit input, calls `joinSessionByCode` Server Action).

**`app/session/actions.ts`**
```ts
"use server";
export async function createSessionDraft(input: { deviceId?: string }) {
  // getCurrentUser → returns ownerUserId to carry into Phase 5 category selection (client keeps in memory/query param)
}

export async function joinSessionByCode(sessionCode: string) {
  // validate 8 digits, look up GameSession by sessionCode
  // return { ok: false, error } on not-found for inline error display
  // return { ok: true, sessionId } — full copy-session duplication logic deferred to Phase 9 (TODO.md)
}
```

---

## Business Logic (per file)

- **Data model (`schema.prisma`)** — encodes PRD §4 exactly so every later phase (game loop, contribution, voting) has a stable, unambiguous storage contract. `Category`/`QuestionType` as enums prevents invalid free-text values from entering categorization logic used throughout §5–§6.
- **`session-code.ts`** — sessionCode is the only mechanism a group has to resume a session on a new device (§6.5) when the original phone dies mid-game; it must never collide and must stay short enough to read aloud, hence 8 numeric digits from an atomic counter rather than random generation with retry loops.
- **`device.ts` / `identity.ts`** — implements §3's "no host role" model: anyone holding the phone is trusted. Guest play must have zero friction (§5.1), so identity is established silently without login, while Google OAuth is optional purely to persist history across devices/sessions.
- **`auth.ts`** — Google sign-in's only product purpose is displayName persistence for the "contributed by" credit (§6.6) and cross-device history — not permission gating (§3 explicitly bans role-based access).
- **`app/page.tsx` (Splash)** — §5.1: minimize friction to "Chơi ngay"; returning users (existing identity) must never see this screen again.
- **`app/session/page.tsx` (Session Home)** — §5.2: the fork point between starting fresh vs. resuming an existing group session via code, directly enabling the "phone died, borrow a friend's phone" real-world scenario that motivated §6.5.

---

## Change Rationale

| File | What changes | Why |
|---|---|---|
| `docker-compose.yml`, `.env.example` | New local infra definitions | PRD mandates Postgres (source of truth) + Redis (locking); needed before any DB code can run |
| `prisma/schema.prisma` | New schema, 7 models + 2 enums | Direct implementation of PRD §4 data model |
| `prisma/seed.ts` | New seed data | Game is unplayable with an empty question pool; PRD implies baseline content exists |
| `lib/db.ts`, `lib/redis.ts` | New singleton clients | Avoid connection leaks under Next.js dev HMR; shared by all future Server Actions |
| `lib/session-code.ts` | New counter-based generator | Chosen mechanism (Socratic Gate) to guarantee collision-free 8-digit codes under concurrent session creation |
| `lib/device.ts`, `lib/identity.ts` | New guest/Google identity resolution | Implements §3 authentication model without an admin/role system |
| `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts` | New NextAuth config | Google OAuth per §3, backed by Prisma adapter for the `User` table |
| `app/globals.css`, `app/layout.tsx` | Modify for fonts/colors/provider | §7.6 typography/color system + NextAuth session context needed app-wide |
| `app/page.tsx` | Replace default Next.js starter content | Becomes the real Splash screen per §5.1 |
| `app/session/page.tsx`, `app/session/actions.ts` | New route + actions | Implements Session Home per §5.2, including the code-join entrypoint that Phase 9 (full copy-session logic) will extend |

---

## Code Pattern Sketch — end-to-end identity resolution flow

```ts
// app/session/actions.ts
"use server";
import { getCurrentUser } from "@/lib/identity";

export async function joinSessionByCode(sessionCode: string, deviceId?: string) {
  // 1. validate format: /^\d{8}$/
  // 2. const user = await getCurrentUser({ deviceId }); // Google session takes precedence if present
  // 3. const session = await prisma.gameSession.findUnique({ where: { sessionCode } });
  // 4. if (!session) return { ok: false, error: "Mã phiên không tồn tại" };
  // 5. return { ok: true, sessionId: session.id }; // full snapshot-copy deferred to Phase 9
}
```

---

## Implementation notes (2026-09-19)

- Prisma 7 uses `prisma.config.ts` + generated client at `generated/prisma` (not `@prisma/client` default output).
- Auth.js is `next-auth@5.0.0-beta.32` (v5 is still on the beta tag).
- Host ports are **5433 / 6380** so Docker does not collide with local Homebrew Postgres/Redis on 5432/6379.
- `joinSessionByCode` is a lookup stub (full snapshot copy is PLAN-004).
- Guest nickname capture stays deferred to PLAN-004 contribute form.

## Manual Test Checklist

- [x] `docker compose up -d` starts Postgres + Redis without port conflicts
- [x] `npx prisma migrate dev` applies cleanly on a fresh DB
- [x] `npx prisma db seed` populates `Topic` + system `Question` rows
- [ ] Fresh browser (no localStorage/cookies): visiting `/` shows Splash screen with both CTAs
- [ ] Click "Chơi ngay" → deviceId written to `localStorage`, `User(authType=device)` row created, redirected to `/session`
- [ ] Reload `/` after guest play → auto-skips Splash, lands on `/session`
- [ ] Click "Đăng nhập với Google" → OAuth completes → `User(authType=google)` row created with `displayName` from Google profile → redirected to `/session`
- [ ] On `/session`, enter a valid existing `sessionCode` → resolves without error (no crash even though full copy logic is stubbed)
- [ ] On `/session`, enter a non-existent 8-digit code → inline error shown, no navigation
- [ ] Two rapid session creations produce two distinct, non-colliding `sessionCode`s (verify in DB)
- [ ] Baloo 2 font renders with correct Vietnamese diacritics on Splash/Session Home text

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
