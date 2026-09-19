import { beforeEach, expect, test } from "bun:test";
import { mock } from "bun:test";
import {
  SESSION_LOCK_KEY_PREFIX,
  SESSION_LOCK_RELEASE_SCRIPT,
  SESSION_LOCK_TTL_MS,
} from "@/lib/constants";

const SESSION_ID = "session-1";
const KEY = `${SESSION_LOCK_KEY_PREFIX}${SESSION_ID}`;

const store = new Map<string, string>();
const evalCalls: unknown[][] = [];
const setCalls: unknown[][] = [];
const nonAtomicCalls: string[] = [];

const fakeRedis = {
  set: async (key: string, token: string, ...rest: unknown[]) => {
    setCalls.push([key, token, ...rest]);

    if (rest.length !== 3 || rest[0] !== "PX" || rest[2] !== "NX") {
      throw new Error("lock must be acquired with SET key token PX <ttl> NX");
    }

    if (store.has(key)) {
      return null;
    }

    store.set(key, token);
    return "OK";
  },
  get: async (key: string) => {
    nonAtomicCalls.push(`get ${key}`);
    return store.get(key) ?? null;
  },
  del: async (key: string) => {
    nonAtomicCalls.push(`del ${key}`);
    return store.delete(key) ? 1 : 0;
  },
  eval: async (...args: unknown[]) => {
    evalCalls.push(args);
    const [script, keyCount, key, token] = args as [
      string,
      number,
      string,
      string,
    ];

    if (script !== SESSION_LOCK_RELEASE_SCRIPT || keyCount !== 1) {
      throw new Error("unexpected release script");
    }

    if (store.get(key) === token) {
      store.delete(key);
      return 1;
    }

    return 0;
  },
  incr: async () => Math.floor(10000000 + Math.random() * 90000000),
};

mock.module("@/lib/redis", () => ({ redis: fakeRedis }));

const { LockContentionError, withSessionLock } = await import(
  "@/lib/redis-lock"
);

beforeEach(() => {
  store.clear();
  evalCalls.length = 0;
  setCalls.length = 0;
  nonAtomicCalls.length = 0;
});

test("runs the work under the lock and releases it immediately", async () => {
  const heldDuringWork = await withSessionLock(SESSION_ID, async () => {
    return store.get(KEY) !== undefined;
  });

  expect(heldDuringWork).toBe(true);
  expect(store.has(KEY)).toBe(false);
  expect(setCalls[0]).toEqual([
    KEY,
    expect.any(String),
    "PX",
    SESSION_LOCK_TTL_MS,
    "NX",
  ]);
  expect(evalCalls.length).toBe(1);
  expect(evalCalls[0][2]).toBe(KEY);
  expect(evalCalls[0][3]).toBe(setCalls[0][1]);
});

test("releases with one atomic compare-and-delete, never a separate GET + DEL", async () => {
  await withSessionLock(SESSION_ID, async () => "done");

  expect(nonAtomicCalls).toEqual([]);
  expect(evalCalls.length).toBe(1);
});

test("fails fast when another holder owns the lock", async () => {
  store.set(KEY, "other-owner-token");
  let ran = false;

  const attempt = withSessionLock(SESSION_ID, async () => {
    ran = true;
    return "never";
  });

  await expect(attempt).rejects.toBeInstanceOf(LockContentionError);
  expect(ran).toBe(false);
  expect(store.get(KEY)).toBe("other-owner-token");
});

test("releases the lock when the work throws", async () => {
  const attempt = withSessionLock(SESSION_ID, async () => {
    throw new Error("boom");
  });

  await expect(attempt).rejects.toThrow("boom");
  expect(store.has(KEY)).toBe(false);
});

test("leaves a lock taken over by a newer holder untouched", async () => {
  await withSessionLock(SESSION_ID, async () => {
    store.set(KEY, "newer-holder-token");
  });

  expect(store.get(KEY)).toBe("newer-holder-token");
});

test("keeps the TTL inside the locked 3-5s range", async () => {
  expect(SESSION_LOCK_TTL_MS).toBeGreaterThanOrEqual(3000);
  expect(SESSION_LOCK_TTL_MS).toBeLessThanOrEqual(5000);
});
