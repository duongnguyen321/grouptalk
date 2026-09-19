# PLAN-002 — Session Setup Flow (Category Select + Player Entry)

Source: [GroupTalk.md](../GroupTalk.md) §5.3, §5.4, §6.2 · Tracks: [TODO.md](../TODO.md) Phase 5–6 · Depends on: PLAN-001 (identity, Session Home)

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| Draft state across 5→6 | `zustand` store with `persist` middleware (localStorage) — survives refresh/back nav before `GameSession` exists |
| UI kit | `shadcn/ui` initialized in this plan (button, input, checkbox, chip/badge) — first UI-heavy phase |
| Final submit | Server Action creates `GameSession` + `SessionPlayer[]` from the zustand draft, then clears the draft |

---

## Brief Task List

1. Install deps: `zustand`, run `shadcn init`, add `button`, `input`, `checkbox`, `badge` components
2. Build `lib/store/session-draft.ts` (zustand + persist: categories, crushQuestionEnabled, players)
3. Build `app/session/new/categories/page.tsx` (Phase 5 — §5.3)
4. Build `app/session/new/players/page.tsx` (Phase 6 — §5.4)
5. Build `app/session/new/actions.ts` — `startGameSession()` Server Action
6. Wire Session Home "Tạo phiên mới" (from PLAN-001) → `/session/new/categories`

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [package.json](../package.json) | modify (deps: zustand, shadcn deps) |
| 2 | [components.json](../components.json) | create (shadcn config) |
| 3 | [lib/utils.ts](../lib/utils.ts) | create (`cn()` helper, shadcn requirement) |
| 4 | [components/ui/button.tsx](../components/ui/button.tsx) | create (shadcn-generated) |
| 5 | [components/ui/input.tsx](../components/ui/input.tsx) | create (shadcn-generated) |
| 6 | [components/ui/checkbox.tsx](../components/ui/checkbox.tsx) | create (shadcn-generated) |
| 7 | [components/ui/badge.tsx](../components/ui/badge.tsx) | create (shadcn-generated) |
| 8 | [lib/store/session-draft.ts](../lib/store/session-draft.ts) | create |
| 9 | [app/session/new/categories/page.tsx](../app/session/new/categories/page.tsx) | create |
| 10 | [app/session/new/players/page.tsx](../app/session/new/players/page.tsx) | create |
| 11 | [app/session/new/actions.ts](../app/session/new/actions.ts) | create |
| 12 | [app/session/page.tsx](../app/session/page.tsx) | modify (link "Tạo phiên mới" → `/session/new/categories`) |

---

## Technical Logic (per file)

**`lib/store/session-draft.ts`**
```ts
interface SessionDraft {
  categories: Category[];            // multi-select, §5.3
  crushQuestionEnabled: boolean;     // only meaningful if FRIENDS in categories
  players: string[];                 // chip list, §5.4
  toggleCategory(c: Category): void;
  setCrush(v: boolean): void;
  addPlayer(name: string): void;
  removePlayer(name: string): void;
  reset(): void;
}
// created with zustand `persist(..., { name: "grouptalk-session-draft" })`
```

**`app/session/new/categories/page.tsx`** — Client Component. 2x2 grid of category cards bound to `toggleCategory`; conditional "thích thầm" checkbox rendered only when `FRIENDS` is selected (§5.3); "Tiếp tục" `<Button disabled={categories.length === 0}>` → `router.push("/session/new/players")`.

**`app/session/new/players/page.tsx`** — Client Component. Chip input: `Enter` key calls `addPlayer(trimmedName)` (reject empty/duplicate), renders removable chips; live count text; "Bắt đầu chơi" disabled while `players.length < 2`; on click calls `startGameSession()` Server Action with draft snapshot.

**`app/session/new/actions.ts`**
```ts
"use server";
export async function startGameSession(input: {
  categories: Category[];
  crushQuestionEnabled: boolean;
  players: string[];
  deviceId?: string;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  // 1. const user = await getCurrentUser({ deviceId }); // from PLAN-001 lib/identity.ts
  // 2. const sessionCode = await nextSessionCode();      // from PLAN-001 lib/session-code.ts
  // 3. prisma.$transaction: create GameSession(ownerUserId, sessionCode, categories, crushQuestionEnabled)
  //    + createMany SessionPlayer(sessionId, displayName) for each player
  // 4. return { ok: true, sessionId }
}
```

---

## Business Logic (per file)

- **`session-draft.ts`** — §5.3–5.4 is a two-screen wizard with no backend record until the group commits to "Bắt đầu chơi"; persisting the draft prevents losing setup progress if the phone browser reloads mid-flow (common on mobile).
- **`categories/page.tsx`** — categories chosen here become `GameSession.categories`, the sole filter for which `Question`s are eligible all game long (§6.1). The "thích thầm" checkbox only exists for `FRIENDS` because it's a Nhóm-bạn-specific relationship dynamic (§6.3), not a general property of every category.
- **`players/page.tsx`** — enforces PRD's explicit ≥2-player minimum (§5.4); no player accounts are created — chips are just names, matching §3's "no host, no per-player identity mapping" rule.
- **`new/actions.ts`** — this is the one moment a `GameSession` and its `SessionPlayer`s are persisted; wrapping in a transaction guarantees the session is never created with zero/partial players.

---

## Code Pattern Sketch

```ts
// app/session/new/players/page.tsx (Client Component excerpt)
function PlayersPage() {
  const { players, addPlayer, removePlayer } = useSessionDraftStore();
  // <ChipInput onSubmit={addPlayer} />
  // <Button disabled={players.length < 2} onClick={() => startGameSession({...draft, deviceId})} />
}
```

---

## Manual Test Checklist

- [ ] `shadcn init` completes; `components/ui/*` render without style errors
- [ ] Selecting/deselecting categories toggles visual "selected" state correctly (multi-select)
- [ ] "Tiếp tục" stays disabled with 0 categories selected
- [ ] Selecting "Nhóm bạn" reveals the "thích thầm" checkbox; deselecting it hides the checkbox and clears its value
- [ ] Refresh the browser mid-flow (after selecting categories, before adding players) → draft persists, categories still selected
- [ ] Adding a duplicate or empty player name is rejected
- [ ] "Bắt đầu chơi" disabled with <2 players; enabled at 2+
- [ ] Submitting creates exactly one `GameSession` row + N `SessionPlayer` rows in DB matching the draft
- [ ] After successful submit, the zustand draft is cleared (starting a second session doesn't leak old players/categories)

---

## Implementation notes (2026-09-19)

- shadcn init used `--preset nova` + radix; helper is the `cn` package re-exported from `lib/utils.ts`.
- shadcn overwrote canvas tokens; restored warm `#f6f1ea` / `#1c1917` and Baloo as `--font-sans`.
- Name helpers live in `lib/player-name.ts` so Server Actions do not import the client zustand store.
- Draft validation is shared in `lib/session-setup.ts`. `startGameSession` wraps `GameSession` + `SessionPlayer` in one Prisma transaction.
- Session Home already linked to `/session/new/categories` in PLAN-001.
- Wheel/play screen remains a placeholder until PLAN-003.

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
