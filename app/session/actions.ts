"use server";

import { SESSION_CODE_PATTERN } from "@/lib/constants";
import { copySessionFromCode } from "@/lib/game/copy-session";
import { getCurrentUser } from "@/lib/identity";

export async function createSessionDraft(input: { deviceId?: string }) {
  const user = await getCurrentUser({ deviceId: input.deviceId });
  return { ok: true as const, ownerUserId: user.id };
}

export async function joinSessionByCode(
  sessionCode: string,
  deviceId?: string,
) {
  if (!SESSION_CODE_PATTERN.test(sessionCode)) {
    return { ok: false as const, error: "Mã phiên phải gồm đúng 8 chữ số" };
  }

  const user = await getCurrentUser({ deviceId });
  return copySessionFromCode(sessionCode, user.id);
}
