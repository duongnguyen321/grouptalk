import {
  SESSION_LOCK_KEY_PREFIX,
  SESSION_LOCK_RELEASE_SCRIPT,
  SESSION_LOCK_TTL_MS,
} from "@/lib/constants";
import { redis } from "@/lib/redis";

export class LockContentionError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} is busy`);
    this.name = "LockContentionError";
  }
}

export async function withSessionLock<T>(
  sessionId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `${SESSION_LOCK_KEY_PREFIX}${sessionId}`;
  const token = crypto.randomUUID();
  const acquired = await redis.set(key, token, "PX", SESSION_LOCK_TTL_MS, "NX");

  if (acquired !== "OK") {
    throw new LockContentionError(sessionId);
  }

  try {
    return await fn();
  } finally {
    // Compare-and-delete in one round trip: a separate GET + DEL can lose the key to a
    // new holder between the two calls and delete a lock we no longer own.
    await redis.eval(SESSION_LOCK_RELEASE_SCRIPT, 1, key, token);
  }
}
