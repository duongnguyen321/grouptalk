import {
  SESSION_LOCK_KEY_PREFIX,
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
    const current = await redis.get(key);
    if (current === token) {
      await redis.del(key);
    }
  }
}
