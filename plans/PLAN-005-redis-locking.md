# PLAN-005 — Concurrency Hardening (Redis Locking)

Source: [GroupTalk.md](../GroupTalk.md) §2, §6.5 (locking scope) · Tracks: [TODO.md](../TODO.md) Phase 12 · Depends on: PLAN-003 (spin/vote actions exist), PLAN-004 (copy action exists)

## Decisions Locked (Socratic Gate)

| Topic | Decision |
|---|---|
| Lock primitive | Manual `SET key NX PX <ttl>` + `DEL` on release (no `redlock` dependency) |
| TTL & contention | Short TTL (3–5s); on contention, **fail fast** with a typed error surfaced to the UI (no blocking poll/retry loop) |
| Scope | Lock key is per-`sessionId` only — never coordinates across two different sessions (matches §6.5: copy creates an independent session, no cross-session locking needed) |

---

## Brief Task List

1. Harden `lib/redis-lock.ts` (from PLAN-003 minimal version): explicit TTL constant, unique lock-owner token to avoid releasing another holder's lock, typed `LockContentionError`
2. Wrap `spinAction` (PLAN-003) with `withSessionLock`
3. Wrap `voteHideAction`'s vote-insert + ratio-check (PLAN-003) with `withSessionLock` scoped by `questionId` context but keyed by `sessionId` for the spin-adjacent path — see rationale below for why vote itself is keyed by `userId+questionId` uniqueness instead
4. Surface `LockContentionError` in the UI: toast "Đang xử lý, vui lòng thử lại" instead of a generic error
5. Add manual concurrency test steps (two browser tabs / two devices on the same session)

---

## File Reference Table

| # | File | Action |
|---|---|---|
| 1 | [lib/redis-lock.ts](../lib/redis-lock.ts) | modify (harden from PLAN-003) |
| 2 | [app/session/[sessionId]/play/actions.ts](../app/session/%5BsessionId%5D/play/actions.ts) | modify (wrap `spinAction`) |
| 3 | [components/play/play-screen.tsx](../components/play/play-screen.tsx) | modify (catch `LockContentionError` → toast) |

> Correction during `/create`: the spin handler lives in `components/play/play-screen.tsx`, not `components/wheel/wheel.tsx`. `Wheel` is a pure SVG renderer that receives `onSpinComplete` and never calls Server Actions, so the contention toast belongs to the component that owns `spinAction`.

---

## Technical Logic (per file)

**`lib/redis-lock.ts`**
```ts
const LOCK_TTL_MS = 4000;

export class LockContentionError extends Error {}

export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const key = `lock:session:${sessionId}`;
  const token = crypto.randomUUID(); // owner token — prevents releasing a lock acquired by someone else after TTL expiry
  const acquired = await redis.set(key, token, "PX", LOCK_TTL_MS, "NX");
  if (!acquired) throw new LockContentionError(`Session ${sessionId} is busy`);
  try {
    return await fn();
  } finally {
    // Compare-and-delete in one round trip (SESSION_LOCK_RELEASE_SCRIPT in lib/constants.ts)
    await redis.eval(SESSION_LOCK_RELEASE_SCRIPT, 1, key, token);
  }
}
```

**`app/session/[sessionId]/play/actions.ts`** — `spinAction` body now runs entirely inside `withSessionLock(sessionId, ...)`; on `LockContentionError`, the Server Action returns `{ ok: false, error: "busy" }` instead of throwing to the client boundary.

**`components/play/play-screen.tsx`** — on `{ ok: false, error: "busy" }`, re-enable the "QUAY" button and show the toast "Đang xử lý, vui lòng thử lại" rather than treating it as a hard failure.

---

## Implementation notes (PLAN-005)

- **Already landed in PLAN-003, verified here:** explicit `SESSION_LOCK_TTL_MS` constant, unique owner token (`crypto.randomUUID()`), typed `LockContentionError`, `spinAction` fully wrapped in `withSessionLock`, contention returned as `{ ok: false, error: SPIN_BUSY_ERROR }`, and the busy toast in `play-screen.tsx`.
- **Hardened in this pass:** lock release moved from the racy `GET` + `DEL` pair to a single `EVAL` compare-and-delete (`SESSION_LOCK_RELEASE_SCRIPT`). The old release could observe its own still-held token, then — after the key expired and a new holder acquired it — issue a `DEL` that freed the *new* holder's lock. Now the script deletes only if the stored value still equals our token, atomically.
- **New:** `lib/redis-lock.test.ts` (6 tests) mocks `@/lib/redis` and pins the contract: acquire with `PX <ttl> NX`, release on success, release on throw, fail-fast `LockContentionError` without running the work, do not touch a lock taken over by a newer holder, and release must be exactly one `EVAL` with **zero** `GET`/`DEL` calls.
- **Not locked (decision upheld):** `voteHideAction` and `revealCardAction`. Their correctness is DB-enforced — `QuestionVote @@unique([userId, questionId])` (schema.prisma:154) and `SessionAnswer @@unique([sessionId, sessionPlayerId, questionId])` (schema.prisma:142) — and both write through `upsert`, so a concurrent double-submit is idempotent. The 30%-ratio soft-delete goes through `question.update({ isDeleted: true })`, which is monotonic and idempotent.
- **Not locked:** `copySessionFromCode` — copy reads the source and writes an independent session, so it never touches the source's `lock:session:` key.

---

## Business Logic (per file)

- **`redis-lock.ts`** — the game's core invariant is "exactly one spin resolves to exactly one winner at a time" (§7.1's suspense mechanic breaks if two spins race); a short TTL protects against a crashed request holding the lock forever, and the owner-token check prevents a slow, already-expired request from deleting a newer holder's lock.
- **Fail-fast over blocking retry** — this is a single-device-passed-around game (§3), so lock contention in practice only happens from accidental double-taps or two browser tabs on the same session; failing fast with a clear retry prompt matches the casual, low-latency nature of the UX far better than making the UI hang on a poll loop.
- **Vote-hide is not lock-wrapped for correctness** — `QuestionVote` already has a DB-level `@@unique([userId, questionId])` constraint (PLAN-001 schema) which is the real correctness guarantee for double-votes; the Redis lock here is reserved specifically for the spin/winner-selection race, keeping the locking surface minimal per the "cross-cutting only where actually needed" principle.

---

## Code Pattern Sketch

```ts
// app/session/[sessionId]/play/actions.ts (excerpt)
export async function spinAction(sessionId: string) {
  try {
    return await withSessionLock(sessionId, async () => {
      const player = await pickRandomPlayer(sessionId);
      return { ok: true as const, player };
    });
  } catch (e) {
    if (e instanceof LockContentionError) return { ok: false as const, error: "busy" };
    throw e;
  }
}
```

---

## Manual Test Checklist

- [ ] Rapid double-click on "QUAY" (same tab): second click's Server Action call returns `busy`, UI shows retry toast, only one winner is produced
- [ ] Two browser tabs open on the same `sessionId`: simultaneous spin attempts — only one succeeds, the other gets the busy toast
- [ ] Lock key expires from Redis automatically after TTL even if a request crashes mid-`spinAction` (verify via `redis-cli TTL lock:session:<id>` then simulate a killed request)
- [ ] After a successful spin completes, the lock key is deleted immediately (not waiting for TTL) — verify via `redis-cli GET`
- [ ] Two devices voting-hide the same question simultaneously: no duplicate `QuestionVote` row (DB unique constraint holds, no crash)
- [ ] Copying the same session code from two devices at once creates two independent sessions without deadlocking (confirms lock is per-sessionId, not global)

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
