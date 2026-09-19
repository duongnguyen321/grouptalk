"use server";

import { Category } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/identity";
import { nextSessionCode } from "@/lib/session-code";
import {
  parseSessionCategories,
  parseSessionPlayers,
} from "@/lib/session-setup";

type StartGameSessionInput = {
  categories: string[];
  crushQuestionEnabled: boolean;
  players: string[];
  deviceId?: string;
};

export async function startGameSession(
  input: StartGameSessionInput,
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const categories = parseSessionCategories(input.categories);
  if (!categories) {
    return { ok: false, error: "Chọn ít nhất một thể loại." };
  }

  const players = parseSessionPlayers(input.players);
  if (!players) {
    return { ok: false, error: "Cần ít nhất 2 tên người chơi, không trùng." };
  }

  const crushQuestionEnabled =
    categories.includes(Category.FRIENDS) && input.crushQuestionEnabled;

  try {
    const user = await getCurrentUser({ deviceId: input.deviceId });
    const sessionCode = await nextSessionCode();

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.gameSession.create({
        data: {
          ownerUserId: user.id,
          sessionCode,
          categories,
          crushQuestionEnabled,
        },
        select: { id: true },
      });

      await tx.sessionPlayer.createMany({
        data: players.map((displayName) => ({
          sessionId: created.id,
          displayName,
        })),
      });

      return created;
    });

    return { ok: true, sessionId: session.id };
  } catch {
    return { ok: false, error: "Không tạo được phiên. Thử lại nhé." };
  }
}
