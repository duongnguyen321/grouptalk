import {
  SESSION_CODE_LENGTH,
  SESSION_CODE_MODULO,
  SESSION_CODE_SEQ_KEY,
} from "@/lib/constants";
import { redis } from "@/lib/redis";

export async function nextSessionCode(): Promise<string> {
  const sequence = await redis.incr(SESSION_CODE_SEQ_KEY);
  return String(sequence % SESSION_CODE_MODULO).padStart(
    SESSION_CODE_LENGTH,
    "0",
  );
}
