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
- `withSessionLock` keys `lock:session:${sessionId}` via `SET NX PX 5000`. Spin contention returns `error: "busy"` — do not block/retry. PLAN-005 may still harden Lua release.
- No audio on wheel, confetti, or card flip. Menu history/contribute/code routes stay stubs until PLAN-004.
- Do not import client play components from Server Actions; keep eligibility helpers in `lib/game/`.
