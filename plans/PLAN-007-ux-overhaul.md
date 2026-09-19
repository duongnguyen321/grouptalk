# PLAN-007 — UX Overhaul

> Fixing navigation, session management, route structure, and polish issues found in the UX audit.

---

## Brief Task List (execution order)

1. **Route restructure** — move `contribute` (page + actions) out of `[sessionId]` into a top-level `/contribute` route
2. **Back navigation** — add a consistent `BackHeader` component used by history, code, contribute, category-select, player-entry sub-screens
3. **Exit confirm dialog** — replace the naked "Thoát phiên" link with a confirm modal
4. **Recent sessions** — "Phiên gần đây" list from localStorage on Session Home
5. **Player chip row mid-game** — show collapsible player name chips below the wheel
6. **Menu visual polish** — add Lucide icons to menu items; replace `categoryIcon()` emoji with Lucide icons (RULE fix)
7. **Session code digit grouping** — render `XXXX XXXX` with a center gap
8. **CategorySelect `whileTap`** — add framer-motion whileTap to category buttons (AGENTS.md rule fix)
9. **Contribute form polish** — custom topic pill select, pill radio buttons, inline validation hints
10. **Quick wins** — `enterKeyHint`, safe-area insets on setup buttons, `loading.tsx` stubs

---

## Route Analysis — What Stays vs. What Moves

| Route | Uses `sessionId`? | Decision |
|---|---|---|
| `/session/[sessionId]/play` | Yes — queries GameSession + players | **Stay** |
| `/session/[sessionId]/history` | Yes — queries SessionAnswer by sessionId | **Stay** |
| `/session/[sessionId]/code` | Yes — queries sessionCode by id | **Stay** |
| `/session/[sessionId]/contribute` | **No** — only fetches Topics (global); sessionId was only used for back-nav | **MOVE → `/contribute`** |

The contribute page never reads the session row for data — the `findUnique` guard was unnecessary. It only passed `sessionId` to the component for the redirect-back URL. Replacing with `?back=<sessionId>` in the query string achieves the same effect cleanly.

---

## Proposed Changes

---

### Phase 1 — Route Restructure: `/contribute`

#### [DELETE] `app/session/[sessionId]/contribute/page.tsx`
#### [DELETE] `app/session/[sessionId]/contribute/actions.ts`

#### [NEW] `app/contribute/page.tsx`
```tsx
import { prisma } from "@/lib/db";
import { ContributeForm } from "@/components/session/contribute-form";

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ back?: string }>;
}) {
  const { back } = await searchParams;
  const topics = await prisma.topic.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <ContributeForm backSessionId={back ?? null} topics={topics} />;
}
```

#### [NEW] `app/contribute/actions.ts`
Move `loadContributeContext` and `submitQuestion` verbatim. No logic changes.

#### [MODIFY] `components/session/contribute-form.tsx`
- Import from `@/app/contribute/actions`
- Replace `sessionId: string` prop with `backSessionId: string | null`
- Back/redirect targets: `backSessionId ? /session/${backSessionId}/play : "/session"`

#### [MODIFY] `components/play/play-screen.tsx` (menu href)
```tsx
// Before:
href={`/session/${sessionId}/contribute`}
// After:
href={`/contribute?back=${sessionId}`}
```

---

### Phase 2 — Back Navigation: `BackHeader` component

#### [NEW] `components/ui/back-header.tsx`
```tsx
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type BackHeaderProps = {
  backHref: string;
  title?: string;
  children?: React.ReactNode; // right-side action slot
};

export function BackHeader({ backHref, title, children }: BackHeaderProps) {
  return (
    <header className="flex items-center gap-2 px-4 pt-5 pb-2">
      <Link
        href={backHref}
        className="flex size-10 items-center justify-center rounded-full bg-ink/8 text-ink"
      >
        <ChevronLeft className="size-5" />
      </Link>
      {title && (
        <p className="flex-1 text-center text-sm font-semibold text-ink-muted">
          {title}
        </p>
      )}
      <div className="size-10 flex items-center justify-center">{children}</div>
    </header>
  );
}
```

#### [MODIFY] `components/session/session-history.tsx`
- Add `<BackHeader backHref={/session/${sessionId}/play} />` at top of `<main>`
- Remove the bottom "Quay lại chơi" `<Link>` (or demote to secondary)

#### [MODIFY] `components/session/session-code-view.tsx`
- Add `<BackHeader backHref={/session/${sessionId}/play} />` at top

#### [MODIFY] `components/session/contribute-form.tsx`
- Add `<BackHeader backHref={backSessionId ? /session/${backSessionId}/play : "/session"} />` at top

#### [MODIFY] `components/session/category-select.tsx`
- Add `<BackHeader backHref="/session" />` at top

#### [MODIFY] `components/session/player-entry.tsx`
- Add `<BackHeader backHref="/session/new/categories" />` at top

---

### Phase 3 — Session Management

#### 3a. Exit Confirm Dialog

#### [NEW] `components/play/exit-session-dialog.tsx`
```tsx
import { AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; };

export function ExitSessionDialog({ open, onOpenChange, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>Thoát phiên chơi?</AlertDialogHeader>
        <p className="text-sm text-ink-soft">Bạn có thể quay lại bằng mã phiên.</p>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-cat-couple-deep text-white">
            Thoát
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### [MODIFY] `components/play/play-screen.tsx`
- Add `exitOpen` state
- In menu nav: replace `<Link href="/session">Thoát phiên</Link>` with:
  ```tsx
  <button onClick={() => { setMenuOpen(false); setExitOpen(true); }}>
    <LogOut className="size-5" /> Thoát phiên
  </button>
  ```
- Add `<ExitSessionDialog open={exitOpen} onOpenChange={setExitOpen} onConfirm={() => router.push("/session")} />`
- Add `<Separator />` above the Thoát button in the menu nav

#### 3b. Recent Sessions

#### [NEW] `lib/recent-sessions.ts`
```ts
import type { Category } from "@/generated/prisma/enums";

const KEY = "grouptalk-recent-sessions";
const MAX = 5;

export type RecentSessionEntry = {
  sessionId: string;
  sessionCode: string;
  categories: Category[];
  createdAt: string;
};

export function saveRecentSession(entry: Omit<RecentSessionEntry, "createdAt">): void {
  const existing = getRecentSessions().filter(r => r.sessionId !== entry.sessionId);
  const next = [{ ...entry, createdAt: new Date().toISOString() }, ...existing].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
}

export function getRecentSessions(): RecentSessionEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}
```

#### [MODIFY] `components/session/player-entry.tsx`
After successful `startGameSession`, call `saveRecentSession({ sessionId, sessionCode, categories })`.
The `startGameSession` action must also return `sessionCode` — update the action return type accordingly.

#### [MODIFY] `app/session/new/actions.ts`
Return `sessionCode` alongside `sessionId` in the `startGameSession` response.

#### [MODIFY] `components/session/session-home.tsx`
- Add a `RecentSessions` client sub-component reading from `getRecentSessions()`
- Renders below the two main action buttons
- Each entry shows: session code + category chips + relative date + "Vào lại" button → `router.push(/session/${sessionId}/play)`
- Uses `useSyncExternalStore` pattern (same as deviceId) to avoid hydration mismatch

---

### Phase 4 — Play Screen Polish

#### 4a. Lucide icons replacing emoji (RULE violation fix)

#### [MODIFY] `lib/game/category-tone.ts`
```ts
import { Heart, Users, User, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function categoryIcon(category: Category): LucideIcon {
  switch (category) {
    case Category.COUPLE:  return Heart;
    case Category.GIRLS:   return User;
    case Category.BOYS:    return Users;
    case Category.FRIENDS: return UsersRound;
  }
}
// categoryLabel() stays unchanged
```

#### [MODIFY] `components/play/play-screen.tsx`
```tsx
// Category badge:
const Icon = categoryIcon(category);
<Icon className="size-3.5 inline-block" />
{categoryLabel(category)}

// Menu items — add icons:
<ClockIcon /> Xem lịch sử phiên
<PlusCircle /> Đóng góp câu hỏi
<Share2 /> Xem mã phiên
<LogOut /> Thoát phiên
```

#### 4b. Session code badge in header

#### [MODIFY] `components/play/play-screen.tsx`
In header, between category badges and menu button, add:
```tsx
<button
  type="button"
  onClick={() => router.push(`/session/${sessionId}/code`)}
  className="ml-auto mr-2 rounded-full bg-white/10 px-3 py-1 font-display text-xs font-bold tracking-widest text-white/80"
>
  {sessionCode}
</button>
```

#### 4c. Player chip row

#### [NEW] `components/play/player-chip-row.tsx`
```tsx
"use client";
// Collapsed: shows "{n} người chơi" tap to expand
// Expanded: AnimatePresence height animation showing all name chips
// Each chip: rounded pill, bg-white/15, text-white text-sm
export function PlayerChipRow({ players }: { players: PlayPlayer[] }) { ... }
```

#### [MODIFY] `components/play/play-screen.tsx`
Replace the footer player count text with `<PlayerChipRow players={players} />` inside the footer area.

---

### Phase 5 — Quick Wins

#### 5a. Session code digit grouping

#### [MODIFY] `components/session/session-code-view.tsx`
```tsx
// Split into two halves, insert a separator span in the middle
const first = sessionCode.slice(0, 4);
const second = sessionCode.slice(4);
// Render first group · separator · second group
// Copy button still copies the plain 8-digit string
```

#### 5b. CategorySelect whileTap

#### [MODIFY] `components/session/category-select.tsx`
```tsx
import { motion } from "framer-motion";
import { TAP_SCALE } from "@/lib/motion";

// Replace <button> with <motion.button whileTap={{ scale: TAP_SCALE }}>
```

#### 5c. Contribute form polish

#### [MODIFY] `components/session/contribute-form.tsx`
- Topic: replace `<select>` with a grid of pill buttons (same 2-col grid pattern as category select), toggling `topicId` state
- Question type: hide the `<input type="radio">` visually (sr-only), style the label as a full-width pill card
- Add inline hint:
  ```tsx
  {!canSubmit && (
    <AnimatePresence>
      <motion.p className="mt-2 text-center text-xs text-ink-muted">
        {!title.trim() || title.trim().length < 4
          ? "Nhập câu hỏi ít nhất 4 ký tự"
          : categories.length === 0
          ? "Chọn ít nhất 1 thể loại"
          : !topicId ? "Chọn chủ đề" : ""}
      </motion.p>
    </AnimatePresence>
  )}
  ```

#### 5d. Minor fixes

#### [MODIFY] `components/session/player-entry.tsx`
- `<Input enterKeyHint="done" ...>`
- Bottom button div: `className="mt-auto pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"`

#### [MODIFY] `components/session/category-select.tsx`
- Bottom button div: `className="mt-auto pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"`

#### [NEW] `app/session/[sessionId]/history/loading.tsx`
```tsx
export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-md space-y-3 pt-16">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-[1.4rem] bg-ink/5 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
```

#### [NEW] `app/contribute/loading.tsx`
```tsx
export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto w-full max-w-md space-y-4 pt-16">
        <div className="h-32 rounded-2xl bg-ink/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-ink/5 animate-pulse" />
        <div className="h-14 rounded-2xl bg-ink/5 animate-pulse" />
      </div>
    </main>
  );
}
```

---

## File Reference Table

| # | Task | Files | Action |
|---|---|---|---|
| 1 | Route restructure | `app/session/[sessionId]/contribute/page.tsx` | DELETE |
| 1 | Route restructure | `app/session/[sessionId]/contribute/actions.ts` | DELETE |
| 1 | Route restructure | `app/contribute/page.tsx` | NEW |
| 1 | Route restructure | `app/contribute/actions.ts` | NEW |
| 1 | Route restructure | `components/session/contribute-form.tsx` | MODIFY |
| 1 | Route restructure | `components/play/play-screen.tsx` | MODIFY |
| 2 | Back navigation | `components/ui/back-header.tsx` | NEW |
| 2 | Back navigation | `components/session/session-history.tsx` | MODIFY |
| 2 | Back navigation | `components/session/session-code-view.tsx` | MODIFY |
| 2 | Back navigation | `components/session/contribute-form.tsx` | MODIFY |
| 2 | Back navigation | `components/session/category-select.tsx` | MODIFY |
| 2 | Back navigation | `components/session/player-entry.tsx` | MODIFY |
| 3a | Exit dialog | `components/play/exit-session-dialog.tsx` | NEW |
| 3a | Exit dialog | `components/play/play-screen.tsx` | MODIFY |
| 3b | Recent sessions | `lib/recent-sessions.ts` | NEW |
| 3b | Recent sessions | `app/session/new/actions.ts` | MODIFY |
| 3b | Recent sessions | `components/session/session-home.tsx` | MODIFY |
| 3b | Recent sessions | `components/session/player-entry.tsx` | MODIFY |
| 4a | Lucide icons | `lib/game/category-tone.ts` | MODIFY |
| 4a | Lucide icons | `components/play/play-screen.tsx` | MODIFY |
| 4b | Code badge in header | `components/play/play-screen.tsx` | MODIFY |
| 4c | Player chip row | `components/play/player-chip-row.tsx` | NEW |
| 4c | Player chip row | `components/play/play-screen.tsx` | MODIFY |
| 5a | Digit grouping | `components/session/session-code-view.tsx` | MODIFY |
| 5b | whileTap | `components/session/category-select.tsx` | MODIFY |
| 5c | Form polish | `components/session/contribute-form.tsx` | MODIFY |
| 5d | Quick wins | `components/session/player-entry.tsx` | MODIFY |
| 5d | Quick wins | `components/session/category-select.tsx` | MODIFY |
| 5d | Loading | `app/session/[sessionId]/history/loading.tsx` | NEW |
| 5d | Loading | `app/contribute/loading.tsx` | NEW |

---

## Business Logic

| Change | Rule |
|---|---|
| Move `/contribute` out of `[sessionId]` | Contribute is user/device-scoped, not session-scoped. Session ID in the URL is misleading. |
| `?back=<sessionId>` query param | Preserves back-to-play UX without coupling the route to the session hierarchy. |
| Recent sessions in localStorage | PRD §5.2 optional feature. Max 5, newest first, pure client — no server calls. |
| Exit confirm dialog | Accidental exit mid-round loses game state. A confirm gate prevents this. |
| Emoji → Lucide icons | Global project rule: "DO NOT USE EMOJI ICON — In Frontend use Library icon". |
| `whileTap` on CategorySelect | AGENTS.md Motion rule: every interactive control must have `whileTap={{ scale: TAP_SCALE }}`. |
| `startGameSession` returns `sessionCode` | Required to save recent sessions with the shareable code. |

---

## Manual Test Checklist

### Route restructure
- [x] `/contribute` loads without error (no `back` param)
- [x] `/contribute?back=<validId>` — back button goes to `/session/<id>/play`
- [x] `/contribute?back=<validId>` — submit redirects to `/session/<id>/play`
- [x] Old URL `/session/<id>/contribute` returns 404

### Back navigation
- [x] History page: ChevronLeft icon in header, tapping goes to play
- [x] Code page: ChevronLeft icon in header, tapping goes to play
- [x] Contribute page: ChevronLeft icon in header
- [x] CategorySelect: ChevronLeft → `/session`
- [x] PlayerEntry: ChevronLeft → `/session/new/categories`

### Exit dialog
- [x] Tap "Thoát phiên" → confirm dialog appears (game not interrupted)
- [x] "Huỷ" → dialog closes, game continues
- [x] "Thoát" → navigates to `/session`

### Recent sessions
- [x] Create a session → appears in "Phiên gần đây" on home
- [x] "Vào lại" → navigates to that session's play screen
- [x] 6th session pushes out oldest (max 5)

### Lucide icons
- [x] Category badges in play header show Lucide icons, no emoji
- [x] Menu items each show a Lucide icon
- [x] Separator visible above "Thoát phiên" in menu

### Session code
- [x] Code displays as two groups of 4 with visible gap
- [x] Copy button copies the full 8-digit string

### CategorySelect
- [x] Tapping category card shows visible scale animation

### Contribute form
- [x] Topic displayed as pill buttons (not native select)
- [x] Question type shows pill cards without radio dots
- [x] Disabled submit shows inline hint explaining why

### Quick wins
- [x] PlayerEntry name input shows "done" key on mobile keyboard
- [x] CategorySelect bottom button not clipped on notch iPhone (≥360px viewport)
- [x] PlayerEntry bottom button not clipped on notch iPhone
- [x] History page shows skeleton while loading

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
