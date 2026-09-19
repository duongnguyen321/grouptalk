# PLAN-006 — Visual Polish, QA/Edge Cases, Deployment

Source: [GroupTalk.md](../GroupTalk.md) §7, §8 · Tracks: [TODO.md](../TODO.md) Phase 13–15 · Depends on: PLAN-002 through PLAN-005 (full app functional)

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| QA scope | Manual checklists only — no new automated test framework introduced |
| Deployment target | Self-hosted VPS |
| Deploy shape | Next.js runs as a bare Node process (PM2/systemd) — Postgres/Redis managed separately (not containerized alongside the app) |

---

## Brief Task List

1. Finalize Tailwind design tokens: 4 category gradients, typography scale, neutral background (§7.6) in `app/globals.css`
2. Mobile-first responsive pass across all screens built in PLAN-002/003/004 (§7.7)
3. Audit for accidental audio/sound effects — remove/confirm none exist (§7.1)
4. Set `next.config.ts` `output: "standalone"` for a minimal production build
5. Add `ecosystem.config.js` (PM2) for running the standalone server as a managed process
6. Write `scripts/deploy.sh` (pull, install, build, `pm2 reload`) and `.env.production.example`
7. Run full end-to-end edge-case QA pass (checklist below) against a staging deploy

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [app/globals.css](../app/globals.css) | modify (final design tokens) |
| 2 | [next.config.ts](../next.config.ts) | modify (`output: "standalone"`) |
| 3 | [ecosystem.config.js](../ecosystem.config.js) | create |
| 4 | [scripts/deploy.sh](../scripts/deploy.sh) | create |
| 5 | [.env.production.example](../.env.production.example) | create |

Files added to this table during `/create` — the token layer is only useful once its consumers read from it:

| # | File | Action |
|---|---|---|
| 6 | [lib/categories.ts](../lib/categories.ts) | modify (gradient + glow utilities instead of inline `from-*`/`to-*`/`rgba()`) |
| 7 | [lib/game/category-tone.ts](../lib/game/category-tone.ts) | modify (`gradient` token; wheel gradient ids) |
| 8 | [components/wheel/wheel.tsx](../components/wheel/wheel.tsx) | modify (SVG `<linearGradient>` defs) |
| 9 | [components/cards/card-selection.tsx](../components/cards/card-selection.tsx) | modify (gradient backs, credit type, mobile sizing) |
| 10 | [components/cards/question-card.tsx](../components/cards/question-card.tsx) | modify (§7.6 name/question/note scale, tap target) |
| 11 | [components/play/play-screen.tsx](../components/play/play-screen.tsx) | modify (safe-area insets, drawer tap targets) |
| 12 | [components/session/player-entry.tsx](../components/session/player-entry.tsx) | modify (expanded delete hit area) |

---

## Technical Logic (per file)

**`app/globals.css`** — CSS custom properties for the 4 category gradients (Cặp đôi `#FF6B81→#C44569`, Nhóm nữ `#A29BFE→#FD79A8`, Nhóm nam `#4834D4→#0984E3`, Nhóm bạn `#FDCB6E→#E17055`), typography scale (name 700/20-24px, question 800/28-36px with `clamp()`, note 400-500/13-14px), neutral light/dark background pair.

**`next.config.ts`**
```ts
const nextConfig: NextConfig = {
  output: "standalone", // minimal server bundle for bare-process deployment
};
```

**`ecosystem.config.js`**
```js
module.exports = {
  apps: [{ name: "grouptalk", script: ".next/standalone/server.js", instances: 1, env: { NODE_ENV: "production" } }],
};
```

**`scripts/deploy.sh`** — `git pull`, `bun install --production`, `bun run build`, copy `public/` + `.next/static` into the standalone output dir (Next.js standalone requirement), `pm2 reload ecosystem.config.js --update-env`.

**`.env.production.example`** — same keys as PLAN-001's `.env.example` (`DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) with production-value placeholders and a comment noting Postgres/Redis are managed independently of the app process.

---

## Business Logic (per file)

- **`globals.css`** — §7.6's color/typography spec is what gives the app its "vui, ấm áp" (fun, warm) party-game identity instead of looking like a generic form-heavy web app; getting this right after functionality is stable avoids rework.
- **`next.config.ts` / `ecosystem.config.js` / `deploy.sh`** — a bare-process deploy was chosen (Socratic Gate) to keep infra ownership simple: the app process is the only thing this repo manages, while Postgres/Redis (already provisioned since PLAN-001's local Docker Compose) are treated as pre-existing managed services in production, avoiding container orchestration complexity for a single-VPS v1.

---

## Code Pattern Sketch

```bash
# scripts/deploy.sh — shape only
set -e
git pull origin main
bun install --production
bun run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
pm2 reload ecosystem.config.js --update-env
```

---

## Implementation notes (PLAN-006)

**Design tokens (`app/globals.css`)** — the 4 category hues already existed as `--cat-*`; what was missing was a gradient/glow token layer and reachable utilities. Added `--grad-*` (the §7.6 gradients) and `--cat-*-glow` (selected-state shadow, derived with `color-mix()` from the deep hue so it can never drift from the palette).

> Correction to the plan: Tailwind v4 has **no** gradient theme namespace, so gradients cannot be registered as `@theme` colours. Verified against the installed tailwindcss 4.3.3 — the only namespaces available are colour/font/text/spacing/radius/shadow/etc. Gradients are therefore exposed as `@utility bg-grad-*` aliases over the `--grad-*` vars, and the stale hand-written `rgba()` glows in `lib/categories.ts` were replaced by `shadow-(--cat-*-glow)`. Compiled output was confirmed in the built CSS, and the rendered shadow is byte-for-byte the same colour/alpha as the literals it replaced.

**Typography** — added `--text-name` / `--text-question` / `--text-note` / `--text-credit` (`--text-*` *is* a real Tailwind namespace) and applied them to the §7.6 card roles: the answerer name (now 700/22px per spec, was 800), the question (`clamp(1.75rem, 5.6vw, 2.25rem)` = 28→36px, was 21.6→34.4px), the note (14px/500) and the card-back contributor credit (13px/500, was 14px).
Deliberate deviation: dense surfaces (history rows, screen headers) keep their own tighter hierarchy rather than reusing `text-question`, and the winner-reveal name stays a large display hero — applying the 20–24px "name" role to either would read as a regression, not compliance.

**Gradients applied in 3 places** — category-select tiles (now via the shared `bg-grad-*` utility, previously duplicated `bg-linear-to-br from-* to-*` strings), the wheel segments, and the card backs. SVG cannot take a CSS `linear-gradient` as a `fill`, so the wheel declares two `<linearGradient>` defs per category (forward + reversed) with `style={{ stopColor: var(...) }}` stops and `fill="url(#id)"`; `wheelSliceGradientId()` is the single source for those ids. Neighbouring wedges alternate forward/reversed so they stay visually distinct while both remain true gradients. `tone.solid` became unused and was removed.

**Mobile (§7.7)** — card backs are now `min(84vw, 19rem)` (was 78vw) against a `min(60vh, 26rem)` height, the revealed question card uses `min-h-[min(28rem,56vh)]` so short screens cannot clip it, the question-card hide button and menu close button were raised to 44px, the player-entry chip delete button kept its 24px visual size but gained an 8px expanded hit area, drawer nav links got `py-2.5`, and the toast / play footer / drawer now offset by `env(safe-area-inset-bottom)`.

**Audio audit (§7.1)** — grep for `Audio`, `AudioContext`, `Oscillator`, `<audio>`, `.play()` and media extensions across `app/`, `components/`, `lib/` returns nothing. The only hit is `navigator.vibrate(18)` on the winner reveal, which is haptics rather than sound and is explicitly allowed.

**Deploy** — `output: "standalone"` is set and the build produces `.next/standalone/server.js`; `ecosystem.config.js` runs it under PM2 in `fork` mode with a single instance (the Prisma/Redis pools are per-process singletons). `scripts/deploy.sh` and `.env.production.example` added.

> Correction to the plan: the sketched `bun install --production` before `bun run build` **fails** — `next build` needs `typescript`, `tailwindcss` and `@tailwindcss/postcss`, all of which are devDependencies. The script installs in full instead; the standalone bundle is self-contained, so no pruning step is needed. The `cp -r public .next/standalone/` sketch is also non-idempotent (it nests `public/` inside itself on a second run), so the script copies directory *contents*.

**Verification status** — `bun test` 27 pass / 0 fail, `bunx tsc --noEmit` and `bun run lint` clean, `bun run build` succeeds with standalone output, the built CSS contains every new utility, and all 8 screens return HTTP 200 from the dev server (the wheel HTML was inspected directly: both `<linearGradient>` defs and both alternating slice fills are present). **Not verified:** anything requiring a real viewport or a device — no browser/visual pass was run, so the manual checklists below are still entirely unchecked, and `pm2` was not exercised (no PM2 install here).

---

## Manual Test Checklist (Phase 13 — Visual Polish)

- [ ] All 4 category gradients render correctly on category-select cards, wheel segments, and card backs
- [ ] Typography scale matches §7.6 across name/question/note text at mobile viewport widths
- [ ] No audio plays on spin, flip, confetti, or any other animation in the app
- [ ] Card/wheel layouts remain usable (no overflow/clipping) on a small phone viewport (~360px width)

## Manual Test Checklist (Phase 14 — QA / Edge Cases)

- [ ] Empty eligible-question-pool fallback (§6.1) verified for each of the 4 categories individually
- [ ] 30% global vote-hide threshold auto-delete verified with a multi-user seed scenario
- [ ] Session copy tested against a session with a large `SessionAnswer` history (50+ rows) for acceptable latency
- [ ] Non-existent/invalid session codes handled gracefully with inline errors, no crashes
- [ ] Guest account and a separately-created Google account are confirmed to have no automatic history merge (matches PRD scope — flagged as accepted limitation, not a bug)
- [ ] Two devices spinning/voting on the same session simultaneously behave per PLAN-005's lock semantics (no duplicate winners/votes)

## Manual Test Checklist (Phase 15 — Deployment)

- [ ] `bun run build` succeeds locally with `output: "standalone"`
- [ ] `pm2 start ecosystem.config.js` runs the standalone server and serves the app on the configured port
- [ ] Production `.env` values (DB/Redis/Auth) load correctly; app connects to production Postgres/Redis
- [ ] Full smoke test on staging: splash → create session → play a full round → contribute a question → copy session to a second device → view history

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
