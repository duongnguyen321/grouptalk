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
- [ ] Optional: "Phiên gần đây trên máy này" list from local history

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

- [ ] Lock wrapper utility keyed by `sessionId` for: spin action, vote action, contribute-triggered auto-delete check
- [ ] Prevent double-spin / concurrent vote race conditions (e.g., two tabs on same session)

## Phase 13 — Visual Polish & Design System (§7)

- [ ] Implement category gradients (Cặp đôi, Nhóm nữ, Nhóm nam, Nhóm bạn) as reusable Tailwind tokens/classes
- [x] Motion on every user flow — shared tokens in `lib/motion.ts`, animated entry/actions/state changes on all PLAN-004 screens (see AGENTS.md "Motion")
- [ ] Typography scale per §7.6 (name, question, note sizes/weights)
- [ ] Mobile-first responsive pass — cards near full-screen on small viewports (§7.7)
- [ ] Dark/neutral background so cards pop
- [ ] Verify no audio anywhere (explicit non-goal)

## Phase 14 — QA / Edge Cases

- [ ] Empty question pool fallback behavior (§6.1) tested per category
- [ ] Vote-hide → 30% threshold auto-delete tested with multiple users
- [ ] Session copy with large history (perf check)
- [ ] Invalid/expired-looking session codes (non-existent) handled gracefully
- [ ] Guest → Google account has no retroactive merge (confirm this is acceptable per PRD scope)
- [ ] Concurrency test: two devices spinning/voting on same session simultaneously

## Phase 15 — Deployment Readiness

- [ ] Production Postgres + Redis provisioning
- [ ] Env var documentation finalized
- [ ] Basic monitoring/logging for Server Actions/API routes
- [ ] Smoke test full flow end-to-end in staging

---

## Explicitly Out of Scope for v1 (per PRD §1.2)

- Multi-language / i18n implementation (keep text externalized for future-proofing only)
- Real-time multi-device sync within one logical session
- Human moderation / admin panel for questions
- Free-tier limits / paywall design
- Ads integration (placement/type decision deferred — §8)
