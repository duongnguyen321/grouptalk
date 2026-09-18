# GroupTalk — TODO

Derived from [GroupTalk.md](GroupTalk.md). Organized into phases; each phase should be shippable/testable on its own before moving to the next.

---

## Phase 0 — Project Foundation

- [ ] Add Prisma + PostgreSQL setup (`prisma init`, `DATABASE_URL` in `.env`)
- [ ] Add Redis client (e.g. `ioredis`) + `REDIS_URL` in `.env`
- [ ] Add Google OAuth provider (NextAuth.js or equivalent) config scaffolding
- [ ] Set up base app layout/theme: fonts (Baloo 2, incl. Vietnamese subset), color tokens for the 4 category gradients (§7.6)
- [ ] Set up `.env.example`, document required env vars in README
- [ ] Decide/scaffold folder structure: `app/(routes)`, `lib/`, `components/`, `prisma/`
- [ ] Add lint/format scripts check (already has ESLint) — confirm passes on scaffold

## Phase 1 — Data Model (Prisma schema)

Based on §4:

- [ ] `User` (id, authType, deviceId, googleId, displayName, createdAt) — unique constraints on deviceId/googleId
- [ ] `GameSession` (id, sessionCode [unique, 8-digit numeric], ownerUserId, copiedFromSessionId, categories[], crushQuestionEnabled, createdAt, lastActiveAt)
- [ ] `SessionPlayer` (id, sessionId, displayName)
- [ ] `Topic` (id, name) — seed hardcoded list
- [ ] `Question` (id, title, type, topicId, categories[], contributedByUserId, isDeleted, createdAt)
- [ ] `SessionAnswer` (id, sessionId, sessionPlayerId, questionId, answeredAt) — unique `[sessionId, sessionPlayerId, questionId]`
- [ ] `QuestionVote` (id, userId, questionId, createdAt) — unique `[userId, questionId]`
- [ ] Write migration, run `prisma migrate dev`
- [ ] Seed script: Topics + baseline system Questions (per category, incl. "thích thầm" topic/category tagging per §6.3)

## Phase 2 — Auth & Identity

- [ ] Guest flow: generate/persist `deviceId` in localStorage/cookie on first "Chơi ngay"; create/find `User(authType=device)`
- [ ] Google OAuth flow: sign-in creates/finds `User(authType=google)`, set `displayName` from Google profile
- [ ] Session/identity resolution middleware or helper (`getCurrentUser()`) usable in Server Actions/API routes
- [ ] Guest nickname capture (one-time, on first contribution) → persist to `User.displayName`, default "Ẩn danh" if skipped

## Phase 3 — Screen: Splash / Login (§5.1)

- [ ] Splash UI: logo, tagline, "Đăng nhập với Google" (secondary), "Chơi ngay" (primary/large)
- [ ] Auto-skip splash if deviceId/session already exists → go to Session Home
- [ ] Wire both actions to Phase 2 identity logic

## Phase 4 — Screen: Session Home (§5.2)

- [ ] "Tạo phiên mới" → Phase 5 (category select)
- [ ] "Nhập mã để tiếp tục phiên" → 8-digit input → validate → Phase 9 (copy session logic) → Phase 7 (main game)
- [ ] Inline error state for invalid/nonexistent code
- [ ] Optional: "Phiên gần đây trên máy này" list from local history

## Phase 5 — Screen: Category Selection (§5.3, §7.5)

- [ ] 2x2 grid, multi-select cards (Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn) with category color styling
- [ ] Conditional "thích thầm" checkbox when "Nhóm bạn" selected (large, prominent per §7.5)
- [ ] "Tiếp tục" disabled until ≥1 category selected
- [ ] Persist selections into pending session draft state (client) until Phase 6 completes

## Phase 6 — Screen: Player List Entry (§5.4)

- [ ] Chip/tag input: add name on Enter, removable chips
- [ ] Player count display + validation (min 2 players) gating "Bắt đầu chơi"
- [ ] On submit: create `GameSession` + `SessionPlayer[]` records (Server Action), navigate to Phase 7

## Phase 7 — Main Game Screen: Wheel (§5.5 State A/B, §7.1)

- [ ] Wheel UI: segments per active players, alternating category-tone colors, readable names
- [ ] Header: category badge (left), menu icon (right, 3-dot/hamburger)
- [ ] "QUAY" button — large, prominent, disabled while spinning
- [ ] Spin animation: ease-out, randomized 2–4s duration, no sound
- [ ] Random player selection logic (equal weight) + disable double-submit (Redis lock by sessionId)
- [ ] Winner reveal: full-width name toast + confetti ~1–1.5s → auto-transition to card selection
- [ ] Footer: player count + "Xem lịch sử phiên" link
- [ ] Menu drawer: Xem lịch sử phiên / Đóng góp câu hỏi / Xem mã phiên / Thoát phiên

## Phase 8 — Card Selection & Reveal (§5.5 State C/D/E, §7.2–7.4)

- [ ] Question selection logic (§6.1): eligible pool = active categories' questions − already-answered-by-this-player (`SessionAnswer`) − vote-hidden-by-current-user (`QuestionVote`) − `isDeleted`; fallback to allow repeats when pool empty (still excluding hidden/deleted)
- [ ] Pick 3 random questions from eligible pool for the teaser cards
- [ ] Card-back UI: category-colored, "?" icon, small "Đóng góp bởi: {name}" (resolve `contributedByUserId` → displayName, else "Ẩn danh")
- [ ] Fan-out/overlap layout, tap-to-select interaction
- [ ] Flip animation (3D Y-axis, ~0.4–0.6s), other 2 cards fade+scale out
- [ ] Card-front layout (§7.3): player name+avatar, question text (auto-shrink), type-specific note text, hidden-vote icon button, "Quay tiếp" button
- [ ] On reveal: immediately create `SessionAnswer` record
- [ ] Vote-hide modal (§7.4): confirm dialog → create `QuestionVote` → toast "Đã ẩn câu hỏi này"
- [ ] Global auto-delete check (§6.4): after vote insert, compute vote ratio vs total users; if ≥30% → set `Question.isDeleted = true`
- [ ] "Quay tiếp" → back to Phase 7 State A

## Phase 9 — Session Copy (§5.7, §6.5)

- [ ] "Xem mã phiên" view: large sessionCode display + copy-to-clipboard
- [ ] "Nhập mã" OTP-style 8-digit input, auto-submit on completion
- [ ] Copy API/Server Action: validate code exists → create new `GameSession` (new id) copying players, `SessionAnswer` history, categories, `crushQuestionEnabled`, set `copiedFromSessionId`
- [ ] Ensure source session remains untouched/active (no locking across sessions)
- [ ] Redis lock scoped per-sessionId only (not cross-session)

## Phase 10 — Contribute a Question (§5.6, §6.2, §6.3)

- [ ] Form: title (textarea), category multi-select, topic select, question type select
- [ ] Auto-tag rule: selecting "Nhóm bạn" auto-checks "Nhóm nam"+"Nhóm nữ" (labeled "tự động", user can uncheck)
- [ ] Guest nickname prompt (first-time only) per Phase 2
- [ ] Submit → create `Question` with `contributedByUserId`, no moderation gate
- [ ] Success toast → return to previous screen
- [ ] Ensure "thích thầm" tagged questions are included in pool when `crushQuestionEnabled` is set on session (§6.3)

## Phase 11 — Session History View

- [ ] List view of `SessionAnswer` for current session (player, question, answeredAt)
- [ ] Show "câu hỏi này đã được gỡ khỏi hệ thống" label when related `Question.isDeleted = true`

## Phase 12 — Cross-Cutting: Redis Locking

- [ ] Lock wrapper utility keyed by `sessionId` for: spin action, vote action, contribute-triggered auto-delete check
- [ ] Prevent double-spin / concurrent vote race conditions (e.g., two tabs on same session)

## Phase 13 — Visual Polish & Design System (§7)

- [ ] Implement category gradients (Cặp đôi, Nhóm nữ, Nhóm nam, Nhóm bạn) as reusable Tailwind tokens/classes
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
