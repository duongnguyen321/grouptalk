<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Project Rules

See [ARCHITECTURE.md](ARCHITECTURE.md) for system structure, data model, and the phased plan files under `plans/`.

## Code Conventions

**Task/bug workflow — always follow this order:**

1. **Research first.** Search the codebase to check whether anything related to the task/bug already exists (components, utilities, similar past fixes).
2. **Find the root cause before touching code.** Report to the user: what the root cause is, why it's happening, what the fix should be, and what the impact/blast radius is.
3. **Implement.** Fix the task/bug, check for impact on other modules, and run tests for the module you touched.

**Comments:** Do not comment to explain what code already shows. Only comment when something genuinely needs explaining (a non-obvious "why", a business rule, a gotcha).

**No hardcoding.** Extract magic values/strings into constants, config, or env vars.

**DRY.** Don't repeat yourself — no duplicated logic across files.

**Reuse existing helpers/utilities before writing new ones:**

1. Inspect the service's `package.json` for installed packages that may already provide the required behavior.
2. Search the service and shared libraries for an existing helper/utility/API with equivalent behavior.
3. If suitable functionality already exists, **reuse it** — do not introduce a new helper/utility.
4. Only add a new helper after confirming neither dependencies nor the existing codebase already solve it.

## Motion (mandatory for every user flow)

Every screen and every user action must animate. A flow is not done when it merely works.

**Required coverage per screen:**

1. **Entry** — the screen's blocks stagger in (`screenContainer` + `screenItem`).
2. **Every interactive control** — buttons, cards, chips, list rows get `whileTap={{ scale: TAP_SCALE }}`.
3. **State changes** — conditional UI (errors, toasts, badges, extra fields, busy labels) mounts/unmounts through `AnimatePresence`, never a hard swap.
4. **Async work** — in-flight state animates (e.g. the button label swaps to "Đang gửi…", the input dims/scales while joining).
5. **Failure** — validation errors animate in and the offending control shakes.

**Rules:**

- Import motion tokens from `lib/motion.ts` — never inline durations, eases, or scales.
- Reuse `screenContainer` / `screenItem` for page-level staggering instead of re-declaring variants.
- Respect reduced motion: pass `disableForReducedMotion` for confetti-style effects, and keep animation decorative, never load-bearing.
- No audio — animation stays silent (see PLAN-003 rules).

## Technical rules (PLAN-001)

- Prisma 7: schema in `prisma/schema.prisma`, config in `prisma.config.ts`, client output in `generated/prisma`. Import from `@/generated/prisma/client` and `@/generated/prisma/enums`.
- Local Docker Compose is required for app data. Host ports are `5433` (Postgres) and `6380` (Redis) because Homebrew already binds `5432`/`6379`. Connection strings live in `.env.example`.
- Auth.js v5 (`next-auth@5.0.0-beta.32`) + `@auth/prisma-adapter`. Google is optional; Splash hides the Google CTA when `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are empty.
- Guest `deviceId` is localStorage-only and spoofable — accepted v1 limitation. Do not add cookie verification in later phases unless the PRD changes.
- `joinSessionByCode` looks up an existing session only. Snapshot copy belongs in PLAN-004.

## Technical rules (PLAN-002)

- Session setup draft is zustand + `persist` (`grouptalk-session-draft`). No `GameSession` row until "Bắt đầu chơi".
- shadcn/ui (radix-nova) lives in `components/ui/*`. Keep Baloo + warm canvas tokens in `app/globals.css` if regenerating shadcn theme.
- `startGameSession` validates via `lib/session-setup.ts`, then Prisma-transactions `GameSession` + `SessionPlayer[]`. Crush flag is stored only when `FRIENDS` is selected.
- Do not import `lib/store/session-draft.ts` from Server Actions; name helpers are in `lib/player-name.ts`.

## Technical rules (PLAN-003)

- Play loop: `spinAction` → wheel animation → `WinnerReveal` → `pickThreeQuestions` teasers → `revealCardAction` (writes `SessionAnswer` immediately) → optional `voteHideAction`.
- Question pool is `lib/game/select-question.ts` + `lib/game/eligibility.ts`. Exclude answered/hidden/deleted first; if empty, drop only the answered exclusion. Crush topic `Thích thầm` requires `crushQuestionEnabled`.
- `withSessionLock` keys `lock:session:${sessionId}` via `SET NX PX 5000`, owner token `crypto.randomUUID()`, released with the atomic Lua compare-and-delete in `SESSION_LOCK_RELEASE_SCRIPT`. Spin contention returns `error: "busy"` — do not block/retry.
- No audio on wheel, confetti, or card flip. Menu history/contribute/code routes stay stubs until PLAN-004.
- Do not import client play components from Server Actions; keep eligibility helpers in `lib/game/`.

## Technical rules (PLAN-004)

- `joinSessionByCode` is a full snapshot copy via `lib/game/copy-session.ts` — never a lookup. Source sessions are never locked or mutated, and the same `sessionCode` can be copied unlimited times.
- Copy remaps `SessionPlayer` ids one-by-one (no `createManyAndReturn` index assumptions) and preserves source `answeredAt` values.
- Contribute auto-tagging is pure state in `lib/game/contribute-form.ts`: `toggleContributeCategory` returns `{ categories, autoTagged }`. Only `FRIENDS` auto-adds `BOYS`+`GIRLS`; `COUPLE` is never auto-tagged.
- `SubmitQuestionInput` validation is server-side (`parseContributeCategories` / `parseQuestionTitle` / `parseQuestionType`); contributions go straight into the pool with no approval step.
- Nickname is written only while `User.displayName` is null; extract copy/UI strings to `lib/constants.ts` (see `HISTORY_DELETED_LABEL`, `CONTRIBUTE_THANKS_TOAST`).
- Motion tokens moved from `lib/game/play-motion.ts` to `lib/motion.ts` (that file is deleted). `lib/motion.ts` also exports the shared `screenContainer` / `screenItem` stagger variants used by every PLAN-004 screen.
- PLAN-004 screens are animated end to end: code view staggers digits and animates the copy label, contribute form staggers its fields and animates the "tự động" badge / nickname field / error / toast, history rows slide in, and Session Home shakes the input on a bad code.

## Technical rules (PLAN-005)

- Locking scope is `sessionId` only — never global, never cross-session. Copying a session (`copySessionFromCode`) must not acquire a lock; copied sessions are independent.
- Never release a Redis lock with a separate `GET` + `DEL`: the key can expire between the two commands and the `DEL` would free a newer holder's lock. Always release through `withSessionLock` (single `EVAL` compare-and-delete).
- Lock contention is a **typed, fail-fast** result, not an exception at the client boundary: `LockContentionError` is caught inside the Server Action and returned as `{ ok: false, error: SPIN_BUSY_ERROR }`.
- Contention UI lives in `components/play/play-screen.tsx` (the component that owns the spin handler) — it re-enables the button and toasts "Đang xử lý, vui lòng thử lại". `components/wheel/wheel.tsx` is a pure SVG renderer and never calls Server Actions.
- Vote-hide and reveal are **not** lock-wrapped. Their correctness comes from DB constraints (`QuestionVote @@unique([userId, questionId])`, `SessionAnswer @@unique([sessionId, sessionPlayerId, questionId])`) plus `upsert`, and the 30%-ratio soft-delete is monotonic, so a benign race cannot produce a duplicate row or a stuck question. Keep the locking surface minimal — add a lock only where a genuine race exists.

## Design tokens (PLAN-006)

- Category colour has exactly **one** definition per category: `--cat-*` (base colours), `--grad-*` (the §7.6 gradients), `--cat-*-glow` (selected-state shadow) in `app/globals.css`. Never re-type a category hex or `rgba()` glow in a component — read it through `lib/game/category-tone.ts` (`light` / `deep` / `gradient`) or the `bg-grad-*` utility.
- Tailwind v4 has **no** gradient theme namespace (verified against tailwindcss 4.3.3). Gradients therefore cannot be `@theme` colours; they are exposed as `@utility bg-grad-*` aliases over the `--grad-*` vars. Follow that pattern for any new gradient.
- SVG cannot consume a CSS `linear-gradient` as a `fill`. The wheel declares `<linearGradient>` defs and references them with `url(#id)`; ids come from `wheelSliceGradientId()` so the `<defs>` and the slice `fill` can never drift. Use `style={{ stopColor: ... }}` (not the `stopColor` attribute) so `var()` resolves.
- Typography scale is `--text-name` / `--text-question` / `--text-note` / `--text-credit` → `text-name`, `text-question`, `text-note`, `text-credit`. These are the **card display roles** from §7.6; dense list rows and screen headers deliberately keep their own tighter hierarchy — do not apply `text-question` inside a list row.
- v1 is **light-only**. The `.dark` block is inert shadcn output — no theme switcher is wired, so do not add dark-specific component styling that assumes it activates.
- No audio anywhere (§7.1). `navigator.vibrate` haptics on the winner reveal is the only sensory feedback and is acceptable; do not add sound.
- Mobile: keep interactive controls ≥44px, and use `env(safe-area-inset-bottom)` on fixed bottom surfaces (toast, footer, drawer) rather than a bare `bottom-*`.

## Deployment (PLAN-006)

- Deploy shape is a **bare Node process** under PM2 (`ecosystem.config.js` → `.next/standalone/server.js`), with Postgres/Redis managed via Docker Compose (`docker compose up -d postgres redis` + healthcheck polling in `scripts/deploy.sh`). Do not containerise the app alongside them.
- `bun install --production` **cannot** be used before `next build`: `typescript`, `tailwindcss` and `@tailwindcss/postcss` are devDependencies and the build needs them. Install in full; the standalone bundle is self-contained so nothing needs pruning.
- Next's standalone output omits `public/` and `.next/static`. `scripts/deploy.sh` copies their **contents** (not the directories) so re-running the release stays idempotent.
- Prisma runs through the `@prisma/adapter-pg` driver adapter, so no Rust query-engine binary ships with the build. `prisma migrate deploy` + `prisma generate` must still run on the server before `next build`.

## Technical rules (PLAN-007)

- `/contribute` is a top-level route (`app/contribute/page.tsx` + `app/contribute/actions.ts`), not nested under `[sessionId]`. It accepts optional `?back=<sessionId>` query param to preserve the back-to-play flow without coupling the page to session DB lookups.
- `BackHeader` (`components/ui/back-header.tsx`) is the standard back-navigation bar for sub-screens (`session-history`, `session-code-view`, `contribute-form`, `category-select`, `player-entry`).
- Exit session flow in `PlayScreen` prompts with `ExitSessionDialog` (`components/play/exit-session-dialog.tsx`) before navigating away to `/session` to avoid losing in-flight round state.
- `saveRecentSession` / `getRecentSessions` in `lib/recent-sessions.ts` stores recently started sessions (max 5) in localStorage, safely consumed in `SessionHome` via `useSyncExternalStore` to prevent hydration mismatch.
- `startGameSession` action returns `{ ok: true, sessionId, sessionCode }` so clients can persist the shareable code immediately.
- Strict Lucide icon rule: NO emojis anywhere in UI code. Category icons (`categoryIcon()`, `CATEGORY_OPTIONS`) return Lucide components (`Heart`, `User`, `Users`, `UsersRound`).
- Interactive controls must have `whileTap={{ scale: TAP_SCALE }}` and ≥44px touch targets.

## Technical rules (PLAN-008)

- Priority configuration lives on `GameSession.priorityConfig` as `Json?` (shape: `{ weights: Record<sessionPlayerId, number> }`). Players with weight 1 or missing from `weights` default to 1x multiplier.
- When all weights are reset to 1x, `setPriorityAction` writes `Prisma.DbNull` to keep the DB field clean.
- `useLongPress` (`lib/hooks/use-long-press.ts`) tracks 700ms long-press via Pointer Events and exposes `didLongPress()` to prevent `onClick` from navigating to `/code` upon releasing after a long-press.
- Server decides winner via `pickWeightedRandom` (`lib/game/eligibility.ts`) inside the Redis-locked `spinAction`. Wheel animation on the client remains completely natural and unchanged.
- `copySessionFromCode` (`lib/game/copy-session.ts`) remaps `priorityConfig.weights` keys from source `SessionPlayer.id` to new `SessionPlayer.id` atomically within the session copy transaction.

## Technical rules (PLAN-009)

- Crush boost teaser selection in `lib/game/eligibility.ts` implements **1 Guaranteed + 2 Weighted** when `crushQuestionEnabled = true`.
- `CRUSH_GUARANTEED_TOPICS` (`Thích thầm`, `Tình cảm`) reserves 1 guaranteed teaser card with fallback chain: `["Thích thầm", "Tình cảm"]` -> `["Kỷ niệm"]` -> general pool.
- `CRUSH_TOPIC_WEIGHT_MAP` boosts remaining teaser slots with topic weights (Thích thầm: 3x, Tình cảm: 3x, Kỷ niệm: 2x, other: 1x) using `pickTopicWeightedRandom`.
- Deduplication is guaranteed by object reference tracking (`Set<T>`) across draws, followed by `shuffleInPlace` so the guaranteed card position is masked.
- Zero regression when `crushQuestionEnabled = false`: maintains pure uniform random selection via fast-path.

## Technical rules (PLAN-010)

- Session access control is strictly enforced on all `[sessionId]` sub-routes (`/play`, `/code`, `/history`). Only the author/owner (`session.ownerUserId === currentUser.id`) is authorized to view or play.
- Unauthorized visitors to `/session/:sessionId/play` (or `/code`, `/history`) are redirected to `/session?unauthorized=1`. Sharing is exclusively done via 8-digit code copying (`joinSessionByCode`).
- `SessionHome` handles `unauthorized` by displaying an explanatory alert banner prompting the user to enter the 8-digit session code to create their independent copy.
- Guest `deviceId` is synced from `localStorage` to `document.cookie` (`grouptalk-device-id`, 1-year expiry, `SameSite=Lax`) to allow Server Components (`page.tsx`) to resolve guest identity seamlessly on request.
- All play-related Server Actions (`spinAction`, `setPriorityAction`, `loadTeaserCardsAction`, `revealCardAction`, `voteHideAction`) enforce author verification via `verifySessionAuthor`.

## Technical rules (PLAN-011)

- Overview statistics (`getOverviewStats`) calculate active question count (`isDeleted: false`) and total player participation (`SessionPlayer` count).
- `StatsOverviewCard` (`components/ui/stats-overview-card.tsx`) renders on both `/` and `/session` and links directly to `/questions`.
- `/questions` is a dynamic server-rendered page (`dynamic = "force-dynamic"`) rendering `BackHeader` and client component `QuestionsExplorer`.
- `QuestionsExplorer` provides horizontal topic filter chips and infinite scrolling (20 items/page via `fetchQuestionsBatch` and `IntersectionObserver`).
- Question items display topic badges, question type pills (`YESNO`, `CHALLENGE`, `OPEN_ENDED`), category tags with Lucide icons (`Heart`, `User`, `Users`, `UsersRound`), and contributor credit.
- Zero emoji policy strictly maintained across all components, actions, and tests.

## Technical rules (PLAN-012)

- Production domain is canonical `https://grouptalk.t5edu.site`. Root `metadataBase` in `app/layout.tsx` is initialized from `NEXT_PUBLIC_APP_URL` falling back to this production URL.
- All icons (`app/apple-icon.png`, `app/favicon.ico`, `app/icon.png`, `public/icon-192.png`, `public/icon-512.png`) are generated from AI image using `scripts/process-ai-icon.ts`.
- ICO multi-resolution file must use 32-bit RGBA (`sharp.ensureAlpha()`) to satisfy Next.js Turbopack image decoder constraints.
- Robots policy: public pages (`/`, `/session`, `/session/new/*`, `/contribute`, `/questions`) allow indexing and are exposed in `app/sitemap.ts`. Ephemeral/private session subroutes (`/session/*/play`, `/session/*/code`, `/session/*/history`, `/session/manage`) strictly set `robots: { index: false, follow: false }` and are disallowed in `app/robots.ts`.
- Dynamic OpenGraph preview card is served via `app/opengraph-image.tsx` using `ImageResponse` with 1200x630 dimension, brand category gradients, and zero emoji policy.

## Technical rules (PLAN-013)

- CI workflow (`.github/workflows/ci.yml`) runs on PRs and pushes to `main` and feature branches. Steps: setup-bun (`1.4.0`), frozen install, `prisma generate`, `eslint`, `tsc --noEmit`, `bun test`, and `next build` validation.
- CD workflow (`.github/workflows/deploy-production.yml`) runs on push to `main` with concurrency group `grouptalk-production` (`cancel-in-progress: false`).
- SSH deployment connects via `appleboy/ssh-action@v1.2.4` using secrets `GROUPTALK_IP`, `GROUPTALK_USERNAME`, `GROUPTALK_PASSWORD` (or `GROUPTALK_SSH_KEY`), targeting `GROUPTALK_PATH`.
- Deployment lifecycle pulls code, starts Docker containers (`postgres`, `redis`), checks health, runs `bun install --frozen-lockfile`, `prisma migrate deploy`, `prisma generate`, `bun run build`, copies standalone assets (`public/`, `.next/static/`), and reloads PM2 (`pm2 reload ecosystem.config.js --update-env`).
- Relative date formatting belongs in `lib/date.ts` (`formatRelativeTime`) rather than inline component functions to prevent React 19 purity warnings with `Date.now()`.
- Zero emoji policy strictly maintained across all GitHub Actions YAML steps, terminal logs, and documentation.

## Technical rules (PLAN-014)

- NextAuth v5 `signOut` is wrapped in `signOutAction` in `app/auth/actions.ts` and handles both programmatic calls (`redirectTo`) and `<form action={signOutAction}>` submissions.
- `signInWithGoogle` supports flexible redirection and FormData compatibility for `<form action={signInWithGoogle}>`.
- Zero redirect trap: The root landing page (`/`, `SplashScreen`) NEVER auto-redirects returning or existing guests to `/session`. Users retain full agency to view stats, read game overview, or click "Chơi ngay" / "Vào phòng chơi".
- User identity is unified via `UserAccountBar` (`components/ui/user-account-bar.tsx`), rendered on `/`, `/session`, and `/session/manage`. Shows Google profile with "Đăng xuất" or Guest status with 1-click "Đăng nhập Google".
- Zero emoji policy strictly maintained across all user account bars, landing headers, and actions.
