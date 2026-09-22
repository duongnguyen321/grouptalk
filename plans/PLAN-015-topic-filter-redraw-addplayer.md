# PLAN-015 — Topic Filter, Card Re-draw & Add Player Mid-Session

## Overview

Three quality-of-life features that make each session more focused, fun, and flexible:

1. **Topic Filter** — host selects which topics (chủ đề) to include when creating a session AND can toggle them during play. Questions outside the selected topics are excluded from the eligible pool.
2. **Card Re-draw** — after revealing a question card, the player can discard it; the `SessionAnswer` row is deleted, the UI returns immediately to the 3-card selection screen with a fresh draw, giving a "not fun enough" escape hatch.
3. **Add Player Mid-Session** — a new menu item inside `PlayScreen` opens an inline sheet where the host can type a name and add a new `SessionPlayer` immediately; the wheel and priority system reload with the new player at weight 1x.

---

## Affected Scope (High-Level)

| Feature | DB schema | Server action | Server logic | UI component |
|---|---|---|---|---|
| Topic filter | `GameSession.selectedTopicIds Json?` | `setTopicFilterAction` | `filterEligibleQuestions`, `pickThreeQuestions` | `TopicFilterSheet` (new), `CategorySelect` (+step), `PlayScreen` |
| Card re-draw | none | `discardCardAction` (deletes `SessionAnswer`) | none | `QuestionCard`, `PlayScreen` |
| Add player | none | `addPlayerAction` (creates `SessionPlayer`) | none | `AddPlayerSheet` (new), `PlayScreen` |

---

## Sequential Task List

1. **[DB]** Add `selectedTopicIds Json?` column to `GameSession` — migration only, no seed changes.
2. **[Lib]** Extend `filterEligibleQuestions` to accept optional `selectedTopicIds` set and filter by `topicId`.
3. **[Server]** Add `setTopicFilterAction` in `play/actions.ts` — persist topic selection to DB.
4. **[Server]** Update `pickThreeQuestions` (`select-question.ts`) to pass `selectedTopicIds` into `filterEligibleQuestions`.
5. **[Server]** Add `discardCardAction` in `play/actions.ts` — delete the matching `SessionAnswer` row.
6. **[Server]** Add `addPlayerAction` in `play/actions.ts` — create a new `SessionPlayer`, return the full updated player list.
7. **[Server]** Add `getTopicsForCategories` in `app/session/new/actions.ts` — query distinct topics for given categories.
8. **[UI]** Build `TopicFilterSheet` component — list of topic chips toggling on/off; calls `setTopicFilterAction`.
9. **[UI]** Extend session setup: `CategorySelect` topic multi-select, `session-draft` store `selectedTopicIds`, `startGameSession` saves them.
10. **[UI]** Build `AddPlayerSheet` component — name input + submit; calls `addPlayerAction`.
11. **[UI]** Update `PlayScreen` — wire `TopicFilterSheet`, `AddPlayerSheet`; handle `discardCardAction`; update local `players` state; pass `selectedTopicIds`.
12. **[Test]** Unit tests for updated `filterEligibleQuestions` with `selectedTopicIds`.

---

## File Reference Table

| Task | File | Change Type |
|---|---|---|
| 1 | `prisma/schema.prisma` | MODIFY |
| 1 | `prisma/migrations/…` | NEW (migration) |
| 2 | `lib/game/eligibility.ts` | MODIFY |
| 3, 5, 6 | `app/session/[sessionId]/play/actions.ts` | MODIFY |
| 4 | `lib/game/select-question.ts` | MODIFY |
| 7 | `app/session/new/actions.ts` | MODIFY |
| 8 | `components/play/topic-filter-sheet.tsx` | NEW |
| 9 | `components/session/category-select.tsx` | MODIFY |
| 9 | `lib/store/session-draft.ts` | MODIFY |
| 10 | `components/play/add-player-sheet.tsx` | NEW |
| 11 | `components/play/play-screen.tsx` | MODIFY |
| 11 | `app/session/[sessionId]/play/page.tsx` | MODIFY |
| 11 | `components/cards/question-card.tsx` | MODIFY |
| 12 | `lib/game/eligibility.test.ts` | MODIFY |

---

## Technical Logic

### Task 1 — DB Schema

```prisma
model GameSession {
  // existing fields …
  selectedTopicIds Json?  // string[] — null = all topics allowed
}
```

Run: `bunx prisma migrate dev --name add-selected-topic-ids`

**No seed changes** — existing sessions default `null` (all topics = no restriction).

---

### Task 2 — `filterEligibleQuestions` (eligibility.ts)

`EligibleQuestion` gains `topicId: string` (breaking internal only, `toEligible()` is the sole producer):

```ts
export type EligibleQuestion = {
  id: string;
  isDeleted: boolean;
  topicName: string;
  topicId: string;       // NEW
  categories: Category[];
};
```

New filter option:
```ts
options: {
  // existing …
  selectedTopicIds?: ReadonlySet<string>; // undefined/empty = no restriction
}
// filter rule (added at the end of the existing checks):
if (
  options.selectedTopicIds &&
  options.selectedTopicIds.size > 0 &&
  !options.selectedTopicIds.has(question.topicId)
) {
  return false;
}
```

---

### Tasks 3, 5, 6 — New Server Actions (play/actions.ts)

**`setTopicFilterAction`**:
```ts
export async function setTopicFilterAction(
  sessionId: string,
  topicIds: string[],
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail>
// verifySessionAuthor → update GameSession.selectedTopicIds
// topicIds.length === 0 → Prisma.DbNull (clear filter)
```

**`discardCardAction`**:
```ts
export async function discardCardAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail>
// verifySessionAuthor
// prisma.sessionAnswer.deleteMany({
//   where: { sessionId, sessionPlayerId, questionId }
// })
// no lock needed — @@unique constraint guarantees at most 1 row
```

**`addPlayerAction`**:
```ts
export async function addPlayerAction(
  sessionId: string,
  displayName: string,
  input?: DeviceInput,
): Promise<{ ok: true; players: PlayPlayer[] } | ActionFail>
// verifySessionAuthor
// normalizePlayerName(displayName) → reject blank/too-long
// check duplicate: prisma.sessionPlayer.findFirst({ where: { sessionId, displayName: normalized } })
// prisma.sessionPlayer.create(...)
// return full player list ordered by id asc
```

---

### Task 4 — `pickThreeQuestions` (select-question.ts)

```ts
const session = await prisma.gameSession.findUnique({
  where: { id: sessionId },
  select: {
    categories: true,
    crushQuestionEnabled: true,
    selectedTopicIds: true,   // NEW
  },
});

const selectedTopicIds =
  Array.isArray(session.selectedTopicIds) && session.selectedTopicIds.length > 0
    ? new Set<string>(session.selectedTopicIds as string[])
    : undefined;

// pass to filterEligibleQuestions:
const eligibilityInput = {
  sessionCategories: session.categories,
  crushQuestionEnabled: session.crushQuestionEnabled,
  hiddenQuestionIds,
  answeredQuestionIds,
  selectedTopicIds,   // NEW
};

// toEligible() also maps topicId:
function toEligible(question: QuestionWithMeta) {
  return {
    id: question.id,
    isDeleted: question.isDeleted,
    topicName: question.topic.name,
    topicId: question.topicId,   // NEW
    categories: question.categories,
  };
}
```

---

### Task 7 — `getTopicsForCategories` (session/new/actions.ts)

```ts
export async function getTopicsForCategories(
  categories: string[],
): Promise<{ id: string; name: string }[]>
// prisma.topic.findMany({
//   where: {
//     questions: {
//       some: {
//         isDeleted: false,
//         categories: { hasSome: validCategories },
//       },
//     },
//   },
//   orderBy: { name: "asc" },
//   select: { id: true, name: true },
// })
```

---

### Task 8 — `TopicFilterSheet`

```tsx
// components/play/topic-filter-sheet.tsx
// Props:
//   open: boolean
//   sessionId: string
//   allTopics: { id: string; name: string }[]
//   activeTopicIds: string[]   // current filter state
//   onOpenChange: (open: boolean) => void
//   onSaved: (topicIds: string[]) => void   // parent updates state

// Local state: selectedIds (Set<string>) initialized from activeTopicIds
// Chips: AnimatePresence, whileTap={{ scale: TAP_SCALE }}
// "Tất cả" shortcut button selects all topics
// "Lưu" button calls setTopicFilterAction then onSaved
// Validation: at least 1 topic must remain selected
```

Topics list passed from `PlayPage` → no client DB call.

---

### Task 9 — Setup Flow Changes

**`session-draft.ts`** gains:
```ts
type SessionDraftSnapshot = {
  // existing …
  selectedTopicIds: string[]; // [] = all topics
};
// new action:
setTopicFilter: (ids: string[]) => void;
```

**`CategorySelect`** — after category chip is selected, a `useEffect` calls `getTopicsForCategories([selectedCategory])` to load topics. These appear below as a togglable topic chip list (collapsed by default, expandable). Selecting at least one is optional — empty = no restriction.

**`startGameSession`** input extended:
```ts
type StartGameSessionInput = {
  // existing …
  selectedTopicIds: string[];
};
// GameSession.create → selectedTopicIds: input.selectedTopicIds.length > 0
//   ? input.selectedTopicIds : Prisma.JsonNull
```

---

### Task 10 — `AddPlayerSheet`

```tsx
// components/play/add-player-sheet.tsx
// Props:
//   open: boolean
//   sessionId: string
//   existingNames: string[]
//   onOpenChange: (open: boolean) => void
//   onPlayerAdded: (players: PlayPlayer[]) => void

// Single <Input> + "Thêm" button
// On submit: addPlayerAction → onPlayerAdded(result.players)
// Inline error (shake animation via Framer Motion)
// whileTap={{ scale: TAP_SCALE }} on button
```

---

### Task 11 — `PlayScreen` wiring

New props:
```ts
type PlayScreenProps = {
  // existing …
  allTopics: { id: string; name: string }[];
  initialSelectedTopicIds: string[];
};
```

New state:
```ts
const [players, setPlayers] = useState<PlayPlayer[]>(initialPlayers);
const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(initialSelectedTopicIds);
```

**Discard flow:**
```
revealed card visible → user taps "Câu khác"
  → discardCardAction(sessionId, winner.id, revealed.id)
  → on success: loadTeaserCardsAction(...) → setCards(newCards) → setPhase("cards")
  → setRevealed(null)
```

**Menu additions:**
- "Chủ đề" (Layers icon) → `setTopicFilterOpen(true)`
- "Thêm người chơi" (UserPlus icon) → `setAddPlayerOpen(true)`

**`QuestionCard`** gains optional `onDiscard?: () => void` prop. When provided, a "Câu khác" button (icon: `RefreshCw`) appears with `whileTap` animation and a confirmation note ("Bỏ thẻ, chọn thẻ mới").

**`PlayPage`** queries topics:
```ts
const allTopics = await prisma.topic.findMany({
  orderBy: { name: "asc" },
  select: { id: true, name: true },
});
const initialSelectedTopicIds =
  Array.isArray(session.selectedTopicIds)
    ? (session.selectedTopicIds as string[])
    : [];
```

---

## Business Logic

| Feature | Why |
|---|---|
| Topic filter at session creation | Host can focus the session on specific themes (e.g., only "Kỷ niệm" + "Ước mơ") before starting, making the question pool more coherent and relevant. |
| Topic filter in-session toggle | If the group finds a topic boring or inappropriate mid-game, the host can toggle it off instantly without ending the session. |
| Card re-draw | A revealed card that isn't fun shouldn't be a dead-end. Discarding it removes the `SessionAnswer` and triggers a fresh 3-card draw so play continues naturally. |
| Add player mid-session | A friend arriving late shouldn't require creating a new session and losing the existing history. Adding them in-place is the natural host action. |

---

## Manual Test Checklist

### Feature 1 — Topic Filter

- [x] Session setup: select category → topic chips appear → deselect 2 topics → "Bắt đầu chơi" → play → verify revealed questions only belong to selected topics.
- [x] Edge case: uncheck ALL topics → "Bắt đầu chơi" disabled with hint "Chọn ít nhất 1 chủ đề".
- [x] No topics unchecked (all selected, i.e., empty filter) → behavior identical to current (no restriction).
- [x] In-session: Menu → "Chủ đề" → toggle off a topic → Save → next card draw excludes that topic.
- [x] Toggle all topics back on → pool unrestricted.
- [x] Copied session inherits `selectedTopicIds` from source (via existing `copySessionFromCode`).

### Feature 2 — Card Re-draw

- [x] Spin → pick a card → card flips/reveals → tap "Câu khác" → 3 new cards appear, previously revealed question absent.
- [x] Check session history: discarded question does NOT appear (no `SessionAnswer` row).
- [x] Pick new card after re-draw → history shows only the second card.
- [x] Re-draw 3 consecutive times → session still progresses normally.
- [x] Re-draw when pool is empty → graceful: discarded question may re-appear in new 3 (its answer was removed).

### Feature 3 — Add Player Mid-Session

- [x] Menu → "Thêm người chơi" → enter name → confirm → wheel immediately shows new segment.
- [x] New player appears in Priority Sheet at weight 1x.
- [x] Adding duplicate name → error "Tên này đã có rồi.".
- [x] Adding blank name → error "Nhập tên rồi mới thêm.".
- [x] New player can be selected winner on next spin.
- [x] Session history and code view still work after adding player.

---

## Plan Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
