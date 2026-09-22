# GroupTalk — TODO

Derived from [GroupTalk.md](GroupTalk.md). Organized into phases; each phase should be shippable/testable on its own before moving to the next.

---

## Phase 0 — Project Foundation

- [x] Add Prisma + PostgreSQL setup (`prisma init`, `DATABASE_URL` in `.env`)
- [x] Add Redis client (e.g. `ioredis`) + `REDIS_URL` in `.env`
- [x] Add Google OAuth provider (NextAuth.js or equivalent) config scaffolding
- [x] Set up base app layout/theme: fonts (Baloo 2, incl. Vietnamese subset), color tokens for the 4 category gradients (§7.6)
- [x] Set up `.env.example`, document required env vars in README
- [x] Decide/scaffold folder structure: `app/(routes)`, `lib/`, `components/`, `prisma/`
- [x] Add lint/format scripts check (already has ESLint) — confirm passes on scaffold

## Phase 1 — Data Model (Prisma schema)

Based on §4:

- [x] `User` (id, authType, deviceId, googleId, displayName, createdAt) — unique constraints on deviceId/googleId
- [x] `GameSession` (id, sessionCode [unique, 8-digit numeric], ownerUserId, copiedFromSessionId, categories[], crushQuestionEnabled, createdAt, lastActiveAt)
- [x] `SessionPlayer` (id, sessionId, displayName)
- [x] `Topic` (id, name) — seed hardcoded list
- [x] `Question` (id, title, type, topicId, categories[], contributedByUserId, isDeleted, createdAt)
- [x] `SessionAnswer` (id, sessionId, sessionPlayerId, questionId, answeredAt) — unique `[sessionId, sessionPlayerId, questionId]`
- [x] `QuestionVote` (id, userId, questionId, createdAt) — unique `[userId, questionId]`
- [x] Write migration, run `prisma migrate dev`
- [x] Seed script: Topics + baseline system Questions (per category, incl. "thích thầm" topic/category tagging per §6.3)

## Phase 2 — Auth & Identity

- [x] Guest flow: generate/persist `deviceId` in localStorage/cookie on first "Chơi ngay"; create/find `User(authType=device)`
- [x] Google OAuth flow: sign-in creates/finds `User(authType=google)`, set `displayName` from Google profile
- [x] Session/identity resolution middleware or helper (`getCurrentUser()`) usable in Server Actions/API routes
- [x] Guest nickname capture (one-time, on first contribution) → persist to `User.displayName`, default "Ẩn danh" if skipped

## Phase 3 — Screen: Splash / Login (§5.1)

- [x] Splash UI: logo, tagline, "Đăng nhập với Google" (secondary), "Chơi ngay" (primary/large)
- [x] Auto-skip splash if deviceId/session already exists → go to Session Home
- [x] Wire both actions to Phase 2 identity logic

## Phase 4 — Screen: Session Home (§5.2)

- [x] "Tạo phiên mới" → Phase 5 (category select)
- [x] "Nhập mã để tiếp tục phiên" → 8-digit input → validate → Phase 9 (copy session logic) → Phase 7 (main game)
- [x] Inline error state for invalid/nonexistent code
- [x] "Phiên gần đây trên máy này" list from local history (PLAN-007)

## Phase 5 — Screen: Category Selection (§5.3, §7.5)

- [x] 2x2 grid, multi-select cards (Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn) with category color styling
- [x] Conditional "thích thầm" checkbox when "Nhóm bạn" selected (large, prominent per §7.5)
- [x] "Tiếp tục" disabled until ≥1 category selected
- [x] Persist selections into pending session draft state (client) until Phase 6 completes

## Phase 6 — Screen: Player List Entry (§5.4)

- [x] Chip/tag input: add name on Enter, removable chips
- [x] Player count display + validation (min 2 players) gating "Bắt đầu chơi"
- [x] On submit: create `GameSession` + `SessionPlayer[]` records (Server Action), navigate to Phase 7

## Phase 7 — Main Game Screen: Wheel (§5.5 State A/B, §7.1)

- [x] Wheel UI: segments per active players, alternating category-tone colors, readable names
- [x] Header: category badge (left), menu icon (right, 3-dot/hamburger)
- [x] "QUAY" button — large, prominent, disabled while spinning
- [x] Spin animation: ease-out, randomized 2–4s duration, no sound
- [x] Random player selection logic (equal weight) + disable double-submit (Redis lock by sessionId)
- [x] Winner reveal: full-width name toast + confetti ~1–1.5s → auto-transition to card selection
- [x] Footer: player count + "Xem lịch sử phiên" link
- [x] Menu drawer: Xem lịch sử phiên / Đóng góp câu hỏi / Xem mã phiên / Thoát phiên

## Phase 8 — Card Selection & Reveal (§5.5 State C/D/E, §7.2–7.4)

- [x] Question selection logic (§6.1): eligible pool = active categories' questions − already-answered-by-this-player (`SessionAnswer`) − vote-hidden-by-current-user (`QuestionVote`) − `isDeleted`; fallback to allow repeats when pool empty (still excluding hidden/deleted)
- [x] Pick 3 random questions from eligible pool for the teaser cards
- [x] Card-back UI: category-colored, "?" icon, small "Đóng góp bởi: {name}" (resolve `contributedByUserId` → displayName, else "Ẩn danh")
- [x] Fan-out/overlap layout, tap-to-select interaction
- [x] Flip animation (3D Y-axis, ~0.4–0.6s), other 2 cards fade+scale out
- [x] Card-front layout (§7.3): player name+avatar, question text (auto-shrink), type-specific note text, hidden-vote icon button, "Quay tiếp" button
- [x] On reveal: immediately create `SessionAnswer` record
- [x] Vote-hide modal (§7.4): confirm dialog → create `QuestionVote` → toast "Đã ẩn câu hỏi này"
- [x] Global auto-delete check (§6.4): after vote insert, compute vote ratio vs total users; if ≥30% → set `Question.isDeleted = true`
- [x] "Quay tiếp" → back to Phase 7 State A

## Phase 9 — Session Copy (§5.7, §6.5)

- [x] "Xem mã phiên" view: large sessionCode display + copy-to-clipboard
- [x] "Nhập mã" OTP-style 8-digit input, auto-submit on completion
- [x] Copy API/Server Action: validate code exists → create new `GameSession` (new id) copying players, `SessionAnswer` history, categories, `crushQuestionEnabled`, set `copiedFromSessionId`
- [x] Ensure source session remains untouched/active (no locking across sessions)
- [x] Redis lock scoped per-sessionId only (not cross-session)

## Phase 10 — Contribute a Question (§5.6, §6.2, §6.3)

- [x] Form: title (textarea), category multi-select, topic select, question type select
- [x] Auto-tag rule: selecting "Nhóm bạn" auto-checks "Nhóm nam"+"Nhóm nữ" (labeled "tự động", user can uncheck)
- [x] Guest nickname prompt (first-time only) per Phase 2
- [x] Submit → create `Question` with `contributedByUserId`, no moderation gate
- [x] Success toast → return to previous screen
- [x] Ensure "thích thầm" tagged questions are included in pool when `crushQuestionEnabled` is set on session (§6.3)

## Phase 11 — Session History View

- [x] List view of `SessionAnswer` for current session (player, question, answeredAt)
- [x] Show "câu hỏi này đã được gỡ khỏi hệ thống" label when related `Question.isDeleted = true`

## Phase 12 — Cross-Cutting: Redis Locking

- [x] Lock wrapper utility keyed by `sessionId` for the spin action (`withSessionLock`)
- [x] Prevent double-spin / concurrent vote race conditions (e.g., two tabs on same session)
- [x] Atomic Lua compare-and-delete release (no separate `GET` + `DEL`) + `lib/redis-lock.test.ts` regression tests
- [x] Vote/reveal race covered by DB unique constraints instead of a lock (scope locked in PLAN-005)
- [ ] Manual two-tab / two-device concurrency check (see PLAN-005 checklist)

## Phase 13 — Visual Polish & Design System (§7)

- [x] Implement category gradients (Cặp đôi, Nhóm nữ, Nhóm nam, Nhóm bạn) as reusable Tailwind tokens/classes — `--grad-*` in `app/globals.css`, `bg-grad-*` utilities, consumed by category cards, wheel SVG segments and card backs
- [x] Motion on every user flow — shared tokens in `lib/motion.ts`, animated entry/actions/state changes on all PLAN-004 screens (see AGENTS.md "Motion")
- [x] Typography scale per §7.6 (name, question, note sizes/weights) — `--text-name` / `--text-question` / `--text-note` / `--text-credit` applied to the card display roles; list/header text intentionally keeps a denser hierarchy (see PLAN-006 notes)
- [x] Verify no audio anywhere (explicit non-goal) — audited: no `Audio`/`AudioContext`/media element anywhere; the only sensory feedback is `navigator.vibrate(18)` haptics on the winner reveal
- [ ] Mobile-first responsive pass — cards near full-screen on small viewports (§7.7) — card sizes widened (84vw), safe-area insets and ≥44px tap targets added, but **not yet eyeballed on a 360px device**
- [ ] Dark/neutral background so cards pop — the light warm-neutral canvas already satisfies §7.6; the `.dark` token block exists but no theme switcher is wired, so v1 ships light-only

## Phase 14 — QA / Edge Cases

- [ ] Empty question pool fallback behavior (§6.1) tested per category
- [ ] Vote-hide → 30% threshold auto-delete tested with multiple users
- [ ] Session copy with large history (perf check)
- [ ] Invalid/expired-looking session codes (non-existent) handled gracefully
- [ ] Guest → Google account has no retroactive merge (confirm this is acceptable per PRD scope)
- [ ] Concurrency test: two devices spinning/voting on same session simultaneously

## Phase 15 — Deployment Readiness

- [x] `output: "standalone"` build + PM2 process definition (`ecosystem.config.js`)
- [x] `scripts/deploy.sh` release script (pull → docker compose up + health check → install → migrate → generate → build → copy assets → reload)
- [x] Env var documentation finalized — `.env.production.example` (dev vs managed Postgres/Redis ports called out)
- [ ] Production Postgres + Redis provisioning
- [ ] Basic monitoring/logging for Server Actions/API routes
- [ ] First real deploy to the VPS (standalone build + PM2 verified locally only)
- [ ] Smoke test full flow end-to-end in staging

## Phase 16 — UX Overhaul (PLAN-007)

- [x] Move `/contribute` out of `[sessionId]` into top-level route with `?back=<sessionId>` support
- [x] `BackHeader` navigation bar across all sub-screens
- [x] Exit session confirmation dialog (`ExitSessionDialog`)
- [x] Recent sessions list ("Phiên gần đây") in Session Home backed by localStorage
- [x] Player chip row mid-game (`PlayerChipRow`) with expand/collapse
- [x] Replace all emoji icons with Lucide icons (Heart, User, Users, UsersRound, etc.)
- [x] Session code digit grouping (`XXXX · XXXX`)
- [x] CategorySelect `whileTap={{ scale: TAP_SCALE }}` motion
- [x] Custom topic pills & question type pill cards in Contribute form with inline validation hints
- [x] Safe-area inset handling on bottom buttons & mobile input `enterKeyHint="done"`

## Phase 17 — Priority Spin (PLAN-008)

- [x] Schema migration: `priorityConfig Json?` on `GameSession`
- [x] Weighted random selection utility `pickWeightedRandom` in `lib/game/eligibility.ts`
- [x] Server Actions: `setPriorityAction` & updated `spinAction` in `app/session/[sessionId]/play/actions.ts`
- [x] Long-press custom hook `useLongPress` in `lib/hooks/use-long-press.ts` (700ms threshold, click guard)
- [x] Host priority sheet drawer `PrioritySheet` in `components/play/priority-sheet.tsx` (3-dot boost UI: 1x, 2x, 3x, 5x)
- [x] Integration with `PlayScreen` and `PlayPage` (initial weights query, long-press on session code chip)
- [x] Session copy priority remapping in `lib/game/copy-session.ts`
- [x] Unit & integration tests in `eligibility.test.ts` and `priority-spin.test.ts`

## Phase 18 — Crush Boost Questions (PLAN-009)

- [x] Topic boost constants in `lib/constants.ts` (`CRUSH_GUARANTEED_TOPICS`, `CRUSH_TOPIC_WEIGHT_MAP`)
- [x] Topic weighted random utility `pickTopicWeightedRandom` in `lib/game/eligibility.ts`
- [x] Refactored `takeTeaserQuestions` supporting `crushQuestionEnabled` with 1 Guaranteed + 2 Weighted algorithm
- [x] Integration with `pickThreeQuestions` in `lib/game/select-question.ts`
- [x] Full unit tests in `lib/game/eligibility.test.ts` (guaranteed inclusion, emotional weighting, fallback chain, tiny pool handling, zero regression)

## Phase 19 — Author Access Control (PLAN-010)

- [x] Guest `deviceId` cookie synchronization in `lib/device.ts` and `components/providers/session-provider.tsx`
- [x] Server-side identity resolution with cookie fallback in `lib/identity.ts` (`getCurrentUserOrNull`)
- [x] Author access control on `/session/[sessionId]/play/page.tsx` (`ownerUserId === currentUser.id`)
- [x] Author access control on sub-pages `/code/page.tsx` and `/history/page.tsx`
- [x] Unauthorized redirect to `/session?unauthorized=1` with informative banner in `SessionHome`
- [x] Server Actions author verification in `app/session/[sessionId]/play/actions.ts` (`spinAction`, `setPriorityAction`, `loadTeaserCardsAction`, `revealCardAction`, `voteHideAction`)
- [x] Unit tests in `lib/author-check.test.ts`

## Phase 20 — Question Stats & Explorer (PLAN-011)

- [x] Pagination constant `QUESTIONS_PAGE_SIZE = 20` in `lib/constants.ts`
- [x] Server Actions: `getOverviewStats()`, `getTopicsWithCounts()`, and `fetchQuestionsBatch()` in `app/questions/actions.ts`
- [x] Reusable `StatsOverviewCard` component with Lucide icons in `components/ui/stats-overview-card.tsx`
- [x] Overview stats widget integration into Splash (`app/page.tsx`, `components/splash/splash-screen.tsx`)
- [x] Overview stats widget integration into Session Home (`app/session/page.tsx`, `components/session/session-home.tsx`)
- [x] Full-featured `/questions` explorer page with `BackHeader`, horizontal topic chips filter, question type & category badges, and infinite scroll (`app/questions/page.tsx`, `components/questions/questions-explorer.tsx`)
- [x] Unit test suite in `lib/questions-pagination.test.ts`

## Phase 21 — Brand Icons & Full-Route SEO (PLAN-012)

- [x] AI-generated app icon via Gemini prompt matching PRD §7.6 color palette and squircle aesthetic
- [x] Automated icon processing script `scripts/process-ai-icon.ts`
- [x] High-resolution Apple Touch Icon `app/apple-icon.png` (180x180) & `public/apple-icon.png`
- [x] Multi-resolution 32-bit RGBA `app/favicon.ico` (16, 32, 48 px) & `public/favicon.ico`
- [x] PWA Icons `public/icon-192.png` & `public/icon-512.png`
- [x] Web App Manifest `app/manifest.ts` (standalone, theme `#F6F1EA`)
- [x] Next.js Robots file `app/robots.ts` with public indexing and private session route protection
- [x] Next.js Sitemap `app/sitemap.ts` with domain `https://grouptalk.t5edu.site`
- [x] Dynamic OpenGraph preview image `app/opengraph-image.tsx` (1200x630)
- [x] Full SEO metadata across all 10 page routes with canonical URLs and keywords

## Phase 22 — CI/CD GitHub Actions (PLAN-013)

- [x] Fix ESLint purity `Date.now()` and extract shared `lib/date.ts` (`formatRelativeTime`)
- [x] Fix PM2 `ecosystem.config.js` ESLint require-import compatibility
- [x] Clean unused imports in `play/actions.ts` and `session-manager.tsx`
- [x] Add database availability guard in `lib/game/priority-spin.test.ts` for clean test runs in isolated environments
- [x] Verify local quality checks: `bun run lint` (0 errors), `bunx tsc --noEmit` (0 errors), `bun test` (48 pass), `bun run build` (success)
- [x] Create GitHub Actions CI workflow `.github/workflows/ci.yml` (Lint, Typecheck, Test, Next.js standalone build verification)
- [x] Create GitHub Actions CD workflow `.github/workflows/deploy-production.yml` (SSH deploy via `appleboy/ssh-action@v1.2.4`, change detection, PM2 reload)
- [x] Document required `GROUPTALK_*` GitHub Secrets in `README.md` and `PLAN-013-cicd-github-actions.md`
## Phase 23 — Auth Flow & Home Overhaul (PLAN-014)

- [x] NextAuth v5 `signOutAction` in `app/auth/actions.ts` supporting programmatic calls and Form Actions
- [x] Flexible `signInWithGoogle` handling `FormData` and custom redirects
- [x] Reusable `UserAccountBar` (`components/ui/user-account-bar.tsx`) with zero-emoji Lucide icons, Framer Motion tap scale, and avatar/status display
- [x] Complete removal of home page redirect trap in `SplashScreen` (`components/splash/splash-screen.tsx`)
- [x] Server-side user identity passing in `app/page.tsx`, `app/session/page.tsx`, and `app/session/manage/page.tsx`
- [x] Direct Google login entry point for anonymous players in `/session` and `/session/manage`
- [x] Direct sign-out button for authenticated Google users across all hub screens
- [x] Unit test suite in `lib/auth-actions.test.ts` (51 tests passing)
- [x] Validation: `bun run lint` (0 errors), `bun x tsc --noEmit` (0 errors), `bun test` (51 pass), `bun run build` (success)

## Phase 24 — Topic Filter, Card Re-draw & Add Player Mid-Session (PLAN-015)

- [x] Schema migration: `selectedTopicIds Json?` on `GameSession` (`prisma/migrations/20260922091500_add_selected_topic_ids`)
- [x] Core game logic: `filterEligibleQuestions` in `lib/game/eligibility.ts` filters questions by `selectedTopicIds`
- [x] Server actions: `setTopicFilterAction`, `discardCardAction`, and `addPlayerAction` in `app/session/[sessionId]/play/actions.ts`
- [x] Topic helper: `getTopicsForCategories` in `app/session/new/actions.ts` queries distinct topics per category
- [x] Session draft store: `selectedTopicIds` in `lib/store/session-draft.ts` with auto-reset on category change
- [x] Session creation: `CategorySelect` topic chips multi-select and `startGameSession` persistence
- [x] TopicFilterSheet: in-session topic toggling drawer in `components/play/topic-filter-sheet.tsx`
- [x] AddPlayerSheet: in-session player addition drawer in `components/play/add-player-sheet.tsx` with instant wheel/priority reload
- [x] QuestionCard: "Câu khác" discard action button with Lucide `RefreshCw` icon in `components/cards/question-card.tsx`
- [x] PlayScreen integration: wire discard flow, topics drawer, add player drawer, and dynamic players state
- [x] Session copy continuity: `copySessionFromCode` preserves `selectedTopicIds`
- [x] Unit tests: topic filtering suite in `lib/game/eligibility.test.ts` (53 tests pass)
- [x] Quality validation: `bun run lint` (0 errors), `bunx tsc --noEmit` (0 errors), `bun test` (53 pass), `bun run build` (success)

## Phase 25 — QuestionType Filter & Tag Another Player (PLAN-016)

- [x] Schema migration: `selectedQuestionTypes Json?` on `GameSession` (`prisma/migrations/20260922111500_add_selected_question_types`)
- [x] Core game logic: `filterEligibleQuestions` in `lib/game/eligibility.ts` filters questions by `selectedQuestionTypes`
- [x] Server actions: `setQuestionFiltersAction` (unified filter) and `tagPlayerAction` in `app/session/[sessionId]/play/actions.ts`
- [x] Session draft store: `selectedQuestionTypes: QuestionType[]` with `setSelectedQuestionTypes` and `toggleQuestionType` in `lib/store/session-draft.ts`
- [x] Setup UI: `CategorySelect` question type filter chips (`Có / Không`, `Thử thách`, `Câu hỏi mở`) with min-1 validation
- [x] Drawer UI: unified `TopicFilterSheet` supporting both question types and topics
- [x] QuestionCard UI: 1-tap chip row of `otherPlayers` using Lucide `UserPlus` icon and motion tap scaling
- [x] PlayScreen integration: wire `handleTagPlayer`, update dynamic respondent and card title, support unlimited chained passes
- [x] Session copy continuity: `copySessionFromCode` preserves `selectedQuestionTypes` on session clone
- [x] Auto-discard on vote-hide: `confirmHide` triggers `discardCardAction` and `loadTeaserCardsAction` to discard hidden card and draw 3 fresh cards
- [x] Tag player deduplication: `revealCardAction` and `tagPlayerAction` return `answeredPlayerIds`, filtering out all players who already answered
- [x] Session-wide question exclusion: `pickThreeQuestions` filters by `where: { sessionId }` ensuring questions answered by any member (or tagged member) do not repeat
- [x] Session history freshness: dynamic server-rendering and `safeRevalidatePath` on history and play pages
- [x] Unit & integration tests: question type filtering and tag player history persistence (`lib/game/tag-player-history.test.ts`, 57 pass)
- [x] Quality validation: `bun run lint` (0 errors), `bunx tsc --noEmit` (0 errors), `bun test` (57 pass), `bun run build` (success)

---



## Explicitly Out of Scope for v1 (per PRD §1.2)

- Multi-language / i18n implementation (keep text externalized for future-proofing only)
- Real-time multi-device sync within one logical session
- Human moderation / admin panel for questions
- Free-tier limits / paywall design
- Ads integration (placement/type decision deferred — §8)
