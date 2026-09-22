"use server";

import { Category, QuestionType } from "@/generated/prisma/enums";
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
  selectedTopicIds?: string[];
  selectedQuestionTypes?: string[];
  players: string[];
  deviceId?: string;
};

export async function getTopicsForCategories(
  categoryNames: string[],
): Promise<{ id: string; name: string }[]> {
  const categories = parseSessionCategories(categoryNames);
  if (!categories || categories.length === 0) {
    return [];
  }

  try {
    const topics = await prisma.topic.findMany({
      where: {
        questions: {
          some: {
            isDeleted: false,
            categories: { hasSome: categories },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return topics;
  } catch {
    return [];
  }
}

export async function startGameSession(
  input: StartGameSessionInput,
): Promise<
  | { ok: true; sessionId: string; sessionCode: string }
  | { ok: false; error: string }
> {
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

  const selectedTopicIds =
    Array.isArray(input.selectedTopicIds) && input.selectedTopicIds.length > 0
      ? input.selectedTopicIds
      : undefined;

  const validTypes = Object.values(QuestionType);
  const selectedQuestionTypes =
    Array.isArray(input.selectedQuestionTypes) &&
    input.selectedQuestionTypes.length > 0 &&
    input.selectedQuestionTypes.length < validTypes.length
      ? input.selectedQuestionTypes.filter((t): t is QuestionType =>
          validTypes.includes(t as QuestionType),
        )
      : undefined;

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
          selectedTopicIds: selectedTopicIds ?? undefined,
          selectedQuestionTypes: selectedQuestionTypes ?? undefined,
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

    return { ok: true, sessionId: session.id, sessionCode };
  } catch {
    return { ok: false, error: "Không tạo được phiên. Thử lại nhé." };
  }
}
