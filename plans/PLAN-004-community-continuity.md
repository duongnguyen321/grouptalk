# PLAN-004 — Session Copy, Contribute Question, Session History

Source: [GroupTalk.md](../GroupTalk.md) §5.6, §5.7, §6.2, §6.5 · Tracks: [TODO.md](../TODO.md) Phase 9–11 · Depends on: PLAN-001 (join stub), PLAN-002/003 (session + players exist)

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| Copy semantics | True snapshot copy (new `GameSession` row), never mutates/locks the source session, per §6.5 |
| Contribution moderation | None — direct insert, no approval queue (matches PRD §1.2 out-of-scope) |
| Guest nickname | Prompted once inline in the contribute form, persisted to `User.displayName` |

---

## Brief Task List

1. Build `lib/game/copy-session.ts` (full snapshot copy: players, answers, categories, crush flag)
2. Extend `app/session/join/actions.ts` (from PLAN-001 stub) to call the real copy logic
3. Build `app/session/[sessionId]/code/page.tsx` ("Xem mã phiên" — display + copy-to-clipboard)
4. Build `app/session/[sessionId]/contribute/page.tsx` + `actions.ts` (contribution form, §5.6)
5. Build `app/session/[sessionId]/history/page.tsx` (§ SessionAnswer list, §4.1 isDeleted label)
6. Wire menu links from `play/page.tsx` (PLAN-003) to code/contribute/history routes

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [lib/game/copy-session.ts](../lib/game/copy-session.ts) | create |
| 2 | [app/session/actions.ts](../app/session/actions.ts) | modify (`joinSessionByCode` → real copy, from PLAN-001 stub) |
| 3 | [app/session/[sessionId]/code/page.tsx](../app/session/%5BsessionId%5D/code/page.tsx) | create |
| 4 | [app/session/[sessionId]/contribute/page.tsx](../app/session/%5BsessionId%5D/contribute/page.tsx) | create |
| 5 | [app/session/[sessionId]/contribute/actions.ts](../app/session/%5BsessionId%5D/contribute/actions.ts) | create |
| 6 | [app/session/[sessionId]/history/page.tsx](../app/session/%5BsessionId%5D/history/page.tsx) | create |
| 7 | [app/session/[sessionId]/play/page.tsx](../app/session/%5BsessionId%5D/play/page.tsx) | modify (menu links, from PLAN-003) |

---

## Technical Logic (per file)

**`lib/game/copy-session.ts`**
```ts
export async function copySessionFromCode(sessionCode: string, ownerUserId: string) {
  // 1. const source = await prisma.gameSession.findUnique({ where: { sessionCode }, include: { players: true } });
  // 2. if (!source) return { ok: false, error: "Mã phiên không tồn tại" };
  // 3. const newCode = await nextSessionCode(); // PLAN-001 lib/session-code.ts
  // 4. $transaction:
  //    - create new GameSession { sessionCode: newCode, ownerUserId, copiedFromSessionId: source.id,
  //        categories: source.categories, crushQuestionEnabled: source.crushQuestionEnabled }
  //    - createMany SessionPlayer for new session (same displayNames, new ids, keep a temp map old->new id)
  //    - createMany SessionAnswer for new session, remapping sessionPlayerId via the temp map, keeping questionId
  // 5. return { ok: true, sessionId: newGameSession.id };
  // NOTE: source session is untouched — no lock, no status flag change (§6.5)
}
```

**`app/session/actions.ts`** — `joinSessionByCode` now delegates to `copySessionFromCode` instead of the PLAN-001 read-only stub; same `{ ok, error | sessionId }` return shape so the Session Home UI needs no changes.

**`app/session/[sessionId]/code/page.tsx`** — Server Component reads `sessionCode`; Client sub-component renders large digits + "Copy" button (`navigator.clipboard.writeText`).

**`app/session/[sessionId]/contribute/page.tsx`** — form: title textarea, category multi-select (checking `FRIENDS` auto-checks `BOYS`+`GIRLS` with an "tự động" label per §6.2, still uncheckable), topic select, question-type radio, conditional one-time nickname field for guests without `displayName`.

**`app/session/[sessionId]/contribute/actions.ts`**
```ts
"use server";
export async function submitQuestion(input: {
  title: string; categories: Category[]; topicId: string; type: QuestionType;
  nickname?: string; deviceId?: string;
}) {
  // 1. user = await getCurrentUser({ deviceId });
  // 2. if (nickname && !user.displayName) update User.displayName = nickname;
  // 3. create Question { ...input, contributedByUserId: user.id, isDeleted: false }
  // 4. return { ok: true };
}
```

**`app/session/[sessionId]/history/page.tsx`** — Server Component: `prisma.sessionAnswer.findMany({ where: { sessionId }, include: { question: true, sessionPlayer: true }, orderBy: { answeredAt: "asc" } })`; renders each row with player name, question title, and a small "câu hỏi này đã được gỡ khỏi hệ thống" badge when `question.isDeleted`.

---

## Business Logic (per file)

- **`copy-session.ts`** — the entire point of §6.5 is solving "phone died mid-party": the new device must get a fully independent, playable session with the same history so no player repeats a question they already answered on the old phone, while the old phone keeps working with zero coordination overhead.
- **`code/page.tsx`** — must be readable/dictate-able out loud (8 plain digits, large font) because in practice one person reads the code to another across a table (§5.7).
- **`contribute/page.tsx` + `actions.ts`** — §6.2's auto-tag rule exists because "Nhóm bạn" content is broad enough to also fit single-gender group play; §6.6's nickname-once flow avoids repeatedly nagging the same guest while still crediting contributions.
- **`history/page.tsx`** — lets a group sanity-check "who already answered what" without re-asking each other, and the isDeleted badge preserves historical accuracy even after a question has been globally removed (§4.1).

---

## Code Pattern Sketch

```ts
// app/session/[sessionId]/contribute/page.tsx (Client Component excerpt)
function ContributeForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  function toggleFriends(checked: boolean) {
    // if checked: add FRIENDS, BOYS, GIRLS (mark BOYS/GIRLS as "auto", still toggleable)
  }
  // <Form action={submitQuestion} /> with nickname field rendered only if !user.displayName
}
```

---

## Manual Test Checklist

- [ ] "Xem mã phiên" shows the correct 8-digit code with working clipboard copy
- [ ] Entering a valid code on a second "device" (browser profile) creates a *new* `GameSession` with `copiedFromSessionId` set
- [ ] Copied session includes all original players and full `SessionAnswer` history (verify counts match source)
- [ ] Original session keeps working normally after being copied (no lock/expiry applied to it)
- [ ] Copying the same code a second time creates yet another independent session (no "already used" error)
- [ ] Contribute form: checking "Nhóm bạn" auto-checks "Nhóm nam"+"Nhóm nữ" with visible "tự động" label; unchecking either works
- [ ] Guest contributing for the first time is prompted for a nickname; skipping stores "Ẩn danh"; second contribution does not re-prompt
- [ ] Submitted question appears immediately in the eligible pool (PLAN-003 `select-question.ts`) with no approval step
- [ ] History view lists answers in chronological order with correct player/question pairing
- [ ] History view shows the "đã được gỡ khỏi hệ thống" label only for answers whose question is `isDeleted`

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?

## Implementation notes (2026-09-19)

- Snapshot copy lives in `lib/game/copy-session.ts`; `joinSessionByCode` now calls it (lookup stub removed). One Prisma transaction creates the new `GameSession` + remapped `SessionPlayer` ids + re-timestamped `SessionAnswer` rows. The source session is never read-locked or mutated, so the same code can be copied repeatedly.
- `SessionAnswer.answeredAt` is copied from the source rather than defaulted to now, so history order survives the copy.
- Contribute helpers are pure and unit-tested in `lib/game/contribute-form.ts` / `.test.ts`: `toggleContributeCategory` returns `{ categories, autoTagged }` so the "tự động" badge disappears when a user un-ticks an auto-added BOYS/GIRLS (un-ticking FRIENDS drops its auto-added pair, but keeps manually chosen ones).
- Contribute screen is `components/session/contribute-form.tsx` + `app/session/[sessionId]/contribute/actions.ts` (`submitQuestion`, `loadContributeContext`). Guest nickname is only written when `User.displayName` is still null — later contributions never re-prompt.
- History screen is `components/session/session-history.tsx` (server-rendered list); the `HISTORY_DELETED_LABEL` badge only renders for `Question.isDeleted`.
- Session code screen is `components/session/session-code-view.tsx` (big 8 digits + clipboard copy).
- Play menu links already pointed at the real routes, so `play/page.tsx` needed no change.
- Motion pass (2026-09-19): shared tokens now live in `lib/motion.ts` (the old `lib/game/play-motion.ts` is deleted and all play components import the new path). PLAN-004 screens follow the mandatory AGENTS.md motion rule — `SessionCodeView` staggers the 8 digits and animates the Copy→Đã copy label, `ContributeForm` staggers its fields and animates the "tự động" badge, nickname field, error, busy label and thank-you toast, `SessionHistory` slides rows in via `AnimatePresence`, and `SessionHome` shakes the code input on an invalid code.
- Manual test checklist below still unchecked — motion was verified by lint/typecheck only, not in a browser.
