# PLAN-003 — Core Game Loop (Wheel + Card Selection/Reveal)

Source: [GroupTalk.md](../GroupTalk.md) §5.5, §6.1, §6.3, §7.1–7.4 · Tracks: [TODO.md](../TODO.md) Phase 7–8 · Depends on: PLAN-002 (GameSession exists)

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| Animation stack | `framer-motion` for wheel spin + card flip; `canvas-confetti` for winner reveal burst |
| Locking | A minimal `lib/redis-lock.ts` helper is introduced here (functional but not yet hardened); PLAN-005 formalizes TTL/fail-fast semantics |
| No sound | Explicitly no audio on any animation (§7.1) |

---

## Brief Task List

1. Install deps: `framer-motion`, `canvas-confetti`, `@types/canvas-confetti`
2. Build `lib/game/select-question.ts` (§6.1 eligible-pool query + fallback-to-repeat logic)
3. Build `lib/redis-lock.ts` (basic per-sessionId lock, minimal version)
4. Build `app/session/[sessionId]/play/page.tsx` (State A — Idle wheel screen)
5. Build `components/wheel/wheel.tsx` + `components/wheel/winner-reveal.tsx` (State B)
6. Build `components/cards/card-selection.tsx` (State C — 3 teaser cards)
7. Build `components/cards/question-card.tsx` (State D — flipped reveal)
8. Build `components/cards/vote-hide-dialog.tsx` (State E) + auto-delete threshold check
9. Build `app/session/[sessionId]/play/actions.ts` — `spinAction`, `revealCardAction`, `voteHideAction`

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [package.json](../package.json) | modify (deps) |
| 2 | [lib/game/select-question.ts](../lib/game/select-question.ts) | create |
| 3 | [lib/redis-lock.ts](../lib/redis-lock.ts) | create |
| 4 | [app/session/[sessionId]/play/page.tsx](../app/session/%5BsessionId%5D/play/page.tsx) | create |
| 5 | [components/wheel/wheel.tsx](../components/wheel/wheel.tsx) | create |
| 6 | [components/wheel/winner-reveal.tsx](../components/wheel/winner-reveal.tsx) | create |
| 7 | [components/cards/card-selection.tsx](../components/cards/card-selection.tsx) | create |
| 8 | [components/cards/question-card.tsx](../components/cards/question-card.tsx) | create |
| 9 | [components/cards/vote-hide-dialog.tsx](../components/cards/vote-hide-dialog.tsx) | create |
| 10 | [app/session/[sessionId]/play/actions.ts](../app/session/%5BsessionId%5D/play/actions.ts) | create |

---

## Technical Logic (per file)

**`lib/game/select-question.ts`**
```ts
// §6.1: eligible pool = active categories' questions
//   − answered-by-this-player (SessionAnswer) − voted-hidden-by-current-user (QuestionVote) − isDeleted
//   if pool empty → drop the "answered-by-this-player" exclusion only, keep hidden/deleted exclusions
export async function pickThreeQuestions(sessionId: string, sessionPlayerId: string, userId: string): Promise<Question[]> { }
```

**`lib/redis-lock.ts`** (minimal version, hardened in PLAN-005)
```ts
export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  // SET `lock:session:${sessionId}` NX PX 5000; if not acquired, throw LockContentionError
  // finally: DEL the key
}
```

**`app/session/[sessionId]/play/page.tsx`** — Server Component: loads `GameSession` + `SessionPlayer[]`; renders `<Wheel>` client component with player names + category badge + menu (history/contribute/session-code/exit links stubbed to PLAN-004 routes).

**`components/wheel/wheel.tsx`** — Client Component. `framer-motion` rotates wheel via animated `rotate` transform, `ease: [0.17, 0.67, 0.3, 0.99]` (ease-out feel), randomized duration 2–4s; `onAnimationComplete` calls `spinAction()`; button disabled during spin.

**`components/wheel/winner-reveal.tsx`** — full-width toast with winner name; `canvas-confetti` burst on mount; auto-dismiss after ~1.5s → parent renders `<CardSelection>`.

**`components/cards/card-selection.tsx`** — fan-out layout of 3 teaser cards from `pickThreeQuestions()` result; each shows `contributedBy` displayName (resolved server-side, default "Ẩn danh"); tap → `framer-motion` 3D Y-axis flip + fade-out siblings → calls `revealCardAction(questionId)`.

**`components/cards/question-card.tsx`** — front face layout per §7.3 (player name+avatar / question text auto-shrink via CSS `clamp()` / type-specific note / vote-hide icon button / "Quay tiếp" button).

**`components/cards/vote-hide-dialog.tsx`** — shadcn `Dialog` confirm → `voteHideAction(questionId)` → toast "Đã ẩn câu hỏi này".

**`app/session/[sessionId]/play/actions.ts`**
```ts
"use server";
export async function spinAction(sessionId: string) {
  // withSessionLock(sessionId, async () => {
  //   pick random SessionPlayer uniformly; return { sessionPlayerId, displayName }
  // });
}
export async function revealCardAction(sessionId: string, sessionPlayerId: string, questionId: string) {
  // create SessionAnswer immediately (§5.5 State D) — unique constraint guards duplicate reveal
}
export async function voteHideAction(userId: string, questionId: string) {
  // withSessionLock-independent: create QuestionVote (unique[userId, questionId])
  // then check ratio = count(votes for questionId) / count(all Users); if >= 0.30 → isDeleted = true (§6.4)
}
```

---

## Business Logic (per file)

- **`select-question.ts`** — implements §6.1 exactly: a player should never repeat a question they've already answered in this session unless the whole category pool is exhausted, and a globally-deleted or personally-hidden question must never resurface.
- **`redis-lock.ts`** — spinning must be atomic per session; without a lock, two rapid taps (or two open tabs on the same session) could select two winners simultaneously, breaking the "one person answers at a time" social contract of the game.
- **`wheel.tsx` / `winner-reveal.tsx`** — §7.1 mandates a genuinely suspenseful, silent (no sound) reveal — this is the emotional centerpiece of the product experience.
- **`card-selection.tsx`** — showing "Đóng góp bởi: {name}" *before* the flip (§6.6) is a deliberate product hook: curiosity about who wrote the question drives which of the 3 cards gets picked, and it credits community contributors.
- **`question-card.tsx`** — the type-specific note text (yes/no vs challenge vs open-ended) tells the player *how* to answer, which is essential since there's no host to explain the rules verbally each round.
- **`vote-hide-dialog.tsx` + auto-delete check** — §6.4's two-tier moderation (personal hide vs. 30%-threshold global delete) is the entire content-moderation strategy for this app — there is no human moderator, so this logic *is* the safety mechanism.

---

## Code Pattern Sketch

```ts
// components/wheel/wheel.tsx (Client Component excerpt)
function Wheel({ players }: { players: SessionPlayer[] }) {
  const [spinning, setSpinning] = useState(false);
  async function handleSpin() {
    setSpinning(true);
    const winner = await spinAction(sessionId); // Server Action, lock-guarded
    // animate framer-motion rotate to land on winner's slice
    // onAnimationComplete: show <WinnerReveal name={winner.displayName} /> then <CardSelection />
  }
}
```

---

## Manual Test Checklist

- [ ] Spin animation eases out over a randomized 2–4s window; no sound plays
- [ ] Rapid double-tap on "QUAY" only produces one winner (button disabled while spinning + lock verified server-side)
- [ ] Winner reveal shows confetti + full-width name toast, then auto-transitions to 3 teaser cards
- [ ] Each teaser card shows correct "Đóng góp bởi" name, or "Ẩn danh" for system/unnamed-guest questions
- [ ] Tapping a card flips it (3D animation) while the other two fade out
- [ ] `SessionAnswer` row is created immediately on reveal (verify in DB, not on any later action)
- [ ] A player who has answered all questions in the active categories gets repeat questions (excluding hidden/deleted) instead of an empty screen
- [ ] Vote-hide flow: confirm modal → toast → question no longer appears for that user in future rounds
- [ ] Vote-hide across many test users pushes a question's vote ratio ≥30% → question disappears for *all* users, including ones who never voted it
- [ ] "Quay tiếp" returns cleanly to the Idle wheel state

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
