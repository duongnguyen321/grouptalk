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
