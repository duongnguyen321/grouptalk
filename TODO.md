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

---

## Explicitly Out of Scope for v1 (per PRD §1.2)

- Multi-language / i18n implementation (keep text externalized for future-proofing only)
- Real-time multi-device sync within one logical session
- Human moderation / admin panel for questions
- Free-tier limits / paywall design
- Ads integration (placement/type decision deferred — §8)
