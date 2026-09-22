# PLAN-016 — QuestionType Filter & Tag Another Player ("Mời người khác cùng trả lời")

## Overview

This plan introduces two gameplay features:

1. **QuestionType Filtering (Lọc thể loại câu hỏi)** — Allow hosts to filter questions by type (`YESNO` / Có-Không, `CHALLENGE` / Thử thách, `OPEN_ENDED` / Mở & chia sẻ) alongside topic filtering, both during session setup and in-game via the filter sheet. Groups wanting pure deep conversation can easily disable challenges and yes/no questions.
2. **Tag Another Player ("Mời người khác cùng trả lời")** — After revealing a question card, the current player can invite any other player in the room to answer the exact same question with a 1-tap chip row on the card. The question can be passed without limits (A invites B, B can invite C, or tap "Quay tiếp" when done), recording each participant's answer in session history for deeper group discussion.

---

## Affected Scope

| Feature             | DB Schema                                 | Server Action                                  | Core Logic                                      | UI Component                         |
| ------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| QuestionType filter | `GameSession.selectedQuestionTypes Json?` | `setQuestionFiltersAction`, `startGameSession` | `filterEligibleQuestions`, `pickThreeQuestions` | `CategorySelect`, `TopicFilterSheet` |
| Tag another player  | none (`SessionAnswer` table reused)       | `tagPlayerAction`                              | none (upsert answer + author verify)            | `QuestionCard`, `PlayScreen`         |

---

## Brief Task List (Max 10 Items)

1. **[DB]** Add `selectedQuestionTypes Json?` column to `GameSession` in `prisma/schema.prisma` and run `prisma generate`.
2. **[Lib]** Extend `EligibleQuestion` and `filterEligibleQuestions` in `lib/game/eligibility.ts` to support `selectedQuestionTypes`.
3. **[Lib]** Update `select-question.ts` to map question `type` into eligibility filter and read `selectedQuestionTypes` from session.
4. **[Lib]** Update `copySessionFromCode` in `lib/game/copy-session.ts` to preserve `selectedQuestionTypes` on session clone.
5. **[Server]** Implement `tagPlayerAction` in `app/session/[sessionId]/play/actions.ts` to record passed answers.
6. **[Server]** Update `startGameSession` and `setTopicFilterAction` (renamed to unified `setQuestionFiltersAction`) to persist `selectedQuestionTypes`.
7. **[Store]** Extend `lib/store/session-draft.ts` to track `selectedQuestionTypes: string[]`.
8. **[UI]** Add QuestionType filter chips to `CategorySelect` (`components/session/category-select.tsx`) and `TopicFilterSheet` (`components/play/topic-filter-sheet.tsx`).
9. **[UI]** Add 1-tap player invitation chips row to `QuestionCard` (`components/cards/question-card.tsx`).
10. **[UI & Test]** Wire player passing state in `PlayScreen` (`components/play/play-screen.tsx`) and add unit tests in `lib/game/eligibility.test.ts`.

---

## File Reference Table

| Task  | File                                                                                    | Change Type | Line Reference |
| ----- | --------------------------------------------------------------------------------------- | ----------- | -------------- |
| 1     | [`prisma/schema.prisma`](../prisma/schema.prisma)                                       | MODIFY      | Line ~90       |
| 1     | `prisma/migrations/20260922111500_add_selected_question_types/migration.sql`            | NEW         | Migration      |
| 2, 10 | [`lib/game/eligibility.ts`](../lib/game/eligibility.ts)                                 | MODIFY      | Lines 10-60    |
| 3     | [`lib/game/select-question.ts`](../lib/game/select-question.ts)                         | MODIFY      | Lines 20-110   |
| 4     | [`lib/game/copy-session.ts`](../lib/game/copy-session.ts)                               | MODIFY      | Lines 35-45    |
| 5, 6  | [`app/session/[sessionId]/play/actions.ts`](../app/session/[sessionId]/play/actions.ts) | MODIFY      | Lines 260-310  |
| 6     | [`app/session/new/actions.ts`](../app/session/new/actions.ts)                           | MODIFY      | Lines 10-50    |
| 7     | [`lib/store/session-draft.ts`](../lib/store/session-draft.ts)                           | MODIFY      | Lines 10-110   |
| 8     | [`components/session/category-select.tsx`](../components/session/category-select.tsx)   | MODIFY      | Lines 160-230  |
| 8     | [`components/play/topic-filter-sheet.tsx`](../components/play/topic-filter-sheet.tsx)   | MODIFY      | Lines 10-200   |
| 9     | [`components/cards/question-card.tsx`](../components/cards/question-card.tsx)           | MODIFY      | Lines 35-70    |
| 10    | [`components/play/play-screen.tsx`](../components/play/play-screen.tsx)                 | MODIFY      | Lines 340-470  |
| 10    | [`lib/game/eligibility.test.ts`](../lib/game/eligibility.test.ts)                       | MODIFY      | Lines 215-280  |

---

## Technical Logic

### Task 1 — DB Schema: `selectedQuestionTypes`

```prisma
model GameSession {
  // existing fields ...
  selectedTopicIds     Json?
  selectedQuestionTypes Json? // string[] of QuestionType names, e.g. ["YESNO", "OPEN_ENDED"]. null = all types allowed
}
```

- Run: `bunx prisma generate` (with manual migration file `prisma/migrations/20260922111500_add_selected_question_types/migration.sql`).
- `selectedQuestionTypes` defaults to `null` (no restriction).

---

### Task 2 — `filterEligibleQuestions` (`lib/game/eligibility.ts`)

```ts
export type EligibleQuestion = {
  id: string;
  isDeleted: boolean;
  topicName: string;
  topicId?: string;
  type?: QuestionType; // NEW
  categories: Category[];
};

export function filterEligibleQuestions(
  questions: EligibleQuestion[],
  options: {
    sessionCategories: Category[];
    crushQuestionEnabled: boolean;
    hiddenQuestionIds: ReadonlySet<string>;
    answeredQuestionIds: ReadonlySet<string>;
    allowAnsweredRepeats: boolean;
    selectedTopicIds?: ReadonlySet<string>;
    selectedQuestionTypes?: ReadonlySet<QuestionType>; // NEW
  },
) {
  return questions.filter((question) => {
    // ... existing checks ...

    // NEW: QuestionType filter (only active when non-empty set provided)
    if (
      options.selectedQuestionTypes &&
      options.selectedQuestionTypes.size > 0 &&
      question.type &&
      !options.selectedQuestionTypes.has(question.type)
    ) {
      return false;
    }

    return true;
  });
}
```

---

### Task 3 — `select-question.ts`

- In `toEligible(question)`: include `type: question.type`.
- In `pickThreeQuestions`:
  - Query `selectedQuestionTypes: true` on `GameSession`.
  - Parse `selectedQuestionTypes` array into `Set<QuestionType> | undefined`.
  - Pass `selectedQuestionTypes` into `filterEligibleQuestions`.

---

### Task 5 — `tagPlayerAction` (`app/session/[sessionId]/play/actions.ts`)

```ts
export async function tagPlayerAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<{ ok: true; player: PlayPlayer } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) return auth;

  const player = await prisma.sessionPlayer.findFirst({
    where: { id: sessionPlayerId, sessionId },
    select: { id: true, displayName: true },
  });
  if (!player) return { ok: false, error: "Không tìm thấy người chơi." };

  await prisma.sessionAnswer.upsert({
    where: {
      sessionId_sessionPlayerId_questionId: {
        sessionId,
        sessionPlayerId,
        questionId,
      },
    },
    create: { sessionId, sessionPlayerId, questionId },
    update: {},
  });

  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });

  return { ok: true, player };
}
```

---

### Task 6 & 7 — Unified Filter Actions and Session Draft

- In `lib/constants.ts`:

```ts
export const QUESTION_TYPE_OPTIONS = [
  { value: "YESNO", label: "Có / Không" },
  { value: "CHALLENGE", label: "Thử thách" },
  { value: "OPEN_ENDED", label: "Mở & Chia sẻ" },
] as const;
```

- In `app/session/[sessionId]/play/actions.ts`:
  - Extend `setTopicFilterAction` (or export unified `setQuestionFiltersAction`) to accept `{ topicIds?: string[], questionTypes?: string[] }`.
  - Clean arrays: empty array stores `Prisma.DbNull`.
- In `lib/store/session-draft.ts`:
  - Add `selectedQuestionTypes: string[]` (default `[]` = all).
  - Add `setSelectedQuestionTypes(types: string[])`.
  - Add `toggleQuestionType(type: string)`.

---

### Task 8 — UI: Filter Chips in `CategorySelect` and `TopicFilterSheet`

- In `CategorySelect` & `TopicFilterSheet`:
  - Display a "Thể loại câu hỏi" block below or above the topics.
  - Three pills:
    - `Có / Không` (`YESNO`)
    - `Thử thách` (`CHALLENGE`)
    - `Mở & Chia sẻ` (`OPEN_ENDED`)
  - Each chip has `whileTap={{ scale: TAP_SCALE }}` and shows a `Check` icon when active.
  - Validation: at least 1 question type must remain active (prevent unchecking all 3).
  - "Tất cả" shortcut selects all types and all topics.

---

### Task 9 — UI: Tag Member Chips in `QuestionCard`

```tsx
// components/cards/question-card.tsx
type QuestionCardProps = {
  card: RevealedCard;
  onHide: () => void;
  onNext: () => void;
  onDiscard?: () => void;
  isDiscarding?: boolean;
  otherPlayers?: PlayPlayer[]; // NEW: list of other players in session
  onTagPlayer?: (player: PlayPlayer) => void; // NEW
  isTagging?: boolean; // NEW
};
```

Layout inside `QuestionCard`:

- Below the type note, add:

```tsx
{
  otherPlayers && otherPlayers.length > 0 && onTagPlayer ? (
    <div className="mt-5 border-t border-ink/10 pt-4">
      <p className="text-xs font-bold text-ink-muted">Mời cùng trả lời:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {otherPlayers.map((player) => (
          <motion.button
            key={player.id}
            type="button"
            disabled={isTagging}
            whileTap={{ scale: TAP_SCALE }}
            onClick={() => onTagPlayer(player)}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-canvas px-3 py-1 text-xs font-bold text-ink transition hover:border-ink/20"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-ink/10 text-[10px]">
              {player.displayName.charAt(0).toUpperCase()}
            </span>
            <span>{player.displayName}</span>
          </motion.button>
        ))}
      </div>
    </div>
  ) : null;
}
```

---

### Task 10 — Multi-Pass Flow in `PlayScreen`

- `currentAnsweringPlayer: PlayPlayer` state initialized to `winner`.
- `otherPlayers = players.filter((p) => p.id !== currentAnsweringPlayer.id)`.
- When `onTagPlayer(targetPlayer)` is triggered:
  1. Call `tagPlayerAction(sessionId, targetPlayer.id, revealed.id)`.
  2. On success:
     - Update `revealed.playerName = targetPlayer.displayName`.
     - Update `currentAnsweringPlayer = targetPlayer`.
     - Display toast: `"Mời ${targetPlayer.displayName} cùng trả lời!"`.
  3. The card updates smoothly via AnimatePresence / key change, showing the new respondent's initial and name.
  4. The new player can in turn tag any other member (excluding themselves) or tap "Quay tiếp" when the group has finished discussing.

---

## Business Logic

| Change                     | Business / User Reason                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QuestionType filtering     | Some groups prefer deep personal conversations and dislike physical/silly challenges, while other groups prefer quick Yes/No questions. Allowing type filtering customizes session mood. |
| In-session type toggle     | Allows changing party vibes on the fly (e.g. switching from casual icebreaker to deep talking late in the evening).                                                                      |
| Direct 1-tap player invite | Lowers friction: instead of opening menus or dialogs, inviting a friend takes a single tap on their name directly below the question.                                                    |
| Unlimited passing chain    | Encourages organic conversation: Person A shares a vulnerability, then passes to Person B, who shares, then passes to Person C to hear their perspective on the same prompt.             |

---

## Code Pattern Sketch

```ts
// tagPlayerAction in app/session/[sessionId]/play/actions.ts
export async function tagPlayerAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<{ ok: true; player: PlayPlayer } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) return auth;

  // upsert SessionAnswer for the newly tagged player
  await prisma.sessionAnswer.upsert({
    where: {
      sessionId_sessionPlayerId_questionId: {
        sessionId,
        sessionPlayerId,
        questionId,
      },
    },
    create: { sessionId, sessionPlayerId, questionId },
    update: {},
  });

  return { ok: true, player };
}

// filterEligibleQuestions in lib/game/eligibility.ts
if (
  options.selectedQuestionTypes &&
  options.selectedQuestionTypes.size > 0 &&
  question.type &&
  !options.selectedQuestionTypes.has(question.type)
) {
  return false;
}
```

---

## Manual Test Checklist

### Feature 1 — QuestionType Filter

- [ ] At session setup (`/session/new/categories`), select category -> verify 3 question type chips appear (`Có / Không`, `Thử thách`, `Mở & Chia sẻ`).
- [ ] Deselect `CHALLENGE` and `YESNO` -> start session -> verify cards drawn only have `OPEN_ENDED` type note.
- [ ] Attempt to deselect all 3 question types -> UI displays error and disables "Tiếp tục".
- [ ] In-game menu -> "Chủ đề & Thể loại" -> toggle `CHALLENGE` back on -> verify next draws can include challenges.
- [ ] Session copy preserves `selectedQuestionTypes`.

### Feature 2 — Tag Another Player ("Mời cùng trả lời")

- [ ] Reveal a card -> verify player name chip row appears below the question (excluding the current player).
- [ ] Tap on another player (e.g., "Linh") -> card header animates to "Linh", toast announces invitation.
- [ ] Check session history -> both original player and "Linh" appear in history for that question.
- [ ] "Linh" can tap another player ("Nam") -> card updates to "Nam" -> history records "Nam".
- [ ] Tap "Quay tiếp" -> returns to wheel for the next round.
- [ ] Tap "Câu khác" -> discards the current question and draws 3 fresh cards.

---

## Plan Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
