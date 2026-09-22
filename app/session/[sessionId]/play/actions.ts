"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { QuestionType } from "@/generated/prisma/enums";
import { PLAYER_NAME_MAX_LENGTH, SPIN_BUSY_ERROR } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  pickWeightedRandom,
  shouldSoftDeleteQuestion,
} from "@/lib/game/eligibility";
import type { PlayPlayer, RevealedCard, TeaserCard } from "@/lib/game/play-types";
import { loadRevealedCard, pickThreeQuestions } from "@/lib/game/select-question";
import { getCurrentUserOrNull } from "@/lib/identity";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";
import { LockContentionError, withSessionLock } from "@/lib/redis-lock";

type ActionFail = { ok: false; error: string };
type DeviceInput = { deviceId?: string };

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // revalidatePath throws when executed outside Next.js request context (e.g. unit tests)
  }
}

async function verifySessionAuthor(
  sessionId: string,
  input?: DeviceInput,
): Promise<{ ok: true; userId: string } | ActionFail> {
  const user = await getCurrentUserOrNull({ deviceId: input?.deviceId });
  if (!user) {
    return { ok: false, error: "Bạn không có quyền thao tác trên phiên này." };
  }

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { ownerUserId: true },
  });

  if (!session || session.ownerUserId !== user.id) {
    return { ok: false, error: "Bạn không có quyền thao tác trên phiên này." };
  }

  return { ok: true, userId: user.id };
}

export async function setPriorityAction(
  sessionId: string,
  weights: Record<string, number>,
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    const players = await prisma.sessionPlayer.findMany({
      where: { sessionId },
      select: { id: true },
    });
    const validIds = new Set(players.map((p) => p.id));
    const cleaned = Object.fromEntries(
      Object.entries(weights).filter(([id, w]) => validIds.has(id) && w > 1),
    );
    const hasBoost = Object.keys(cleaned).length > 0;
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { priorityConfig: hasBoost ? { weights: cleaned } : Prisma.DbNull },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Không lưu được cấu hình ưu tiên." };
  }
}

export async function spinAction(
  sessionId: string,
  input?: DeviceInput,
): Promise<{ ok: true; player: PlayPlayer } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    return await withSessionLock(sessionId, async () => {

      const [players, session] = await Promise.all([
        prisma.sessionPlayer.findMany({
          where: { sessionId },
          select: { id: true, displayName: true },
        }),
        prisma.gameSession.findUnique({
          where: { id: sessionId },
          select: { priorityConfig: true },
        }),
      ]);

      const weights =
        (session?.priorityConfig as { weights?: Record<string, number> } | null)
          ?.weights ?? {};

      const player = pickWeightedRandom(players, weights);

      if (!player) {
        return { ok: false as const, error: "Phiên này chưa có người chơi." };
      }

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      });

      return { ok: true as const, player };
    });
  } catch (error) {
    if (error instanceof LockContentionError) {
      return { ok: false, error: SPIN_BUSY_ERROR };
    }

    return { ok: false, error: "Không quay được. Thử lại nhé." };
  }
}

export async function loadTeaserCardsAction(
  sessionId: string,
  sessionPlayerId: string,
  input: DeviceInput,
): Promise<{ ok: true; cards: TeaserCard[] } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    const cards = await pickThreeQuestions(
      sessionId,
      sessionPlayerId,
      auth.userId,
    );

    if (cards.length === 0) {
      return { ok: false, error: "Chưa có câu hỏi phù hợp cho phiên này." };
    }

    return { ok: true, cards };
  } catch {
    return { ok: false, error: "Không lấy được thẻ câu hỏi." };
  }
}

export async function revealCardAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<
  | { ok: true; card: RevealedCard; answeredPlayerIds: string[] }
  | ActionFail
> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    const [session, player] = await Promise.all([
      prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: { id: true, categories: true },
      }),
      prisma.sessionPlayer.findFirst({
        where: { id: sessionPlayerId, sessionId },
        select: { id: true, displayName: true },
      }),
    ]);

    if (!session || !player) {
      return { ok: false, error: "Không tìm thấy phiên hoặc người chơi." };
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });

    if (!question) {
      return { ok: false, error: "Câu hỏi không còn trong kho." };
    }

    await prisma.sessionAnswer.upsert({
      where: {
        sessionId_sessionPlayerId_questionId: {
          sessionId,
          sessionPlayerId,
          questionId,
        },
      },
      create: {
        sessionId,
        sessionPlayerId,
        questionId,
      },
      update: {},
    });

    const card = await loadRevealedCard({
      questionId,
      playerName: player.displayName,
      sessionCategories: session.categories,
    });

    if (!card) {
      return { ok: false, error: "Không mở được thẻ." };
    }

    const [sessionAnswers] = await Promise.all([
      prisma.sessionAnswer.findMany({
        where: { sessionId, questionId },
        select: { sessionPlayerId: true },
      }),
      prisma.gameSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    const answeredPlayerIds = sessionAnswers.map((a) => a.sessionPlayerId);

    safeRevalidatePath(`/session/${sessionId}/history`);

    return { ok: true, card, answeredPlayerIds };
  } catch {
    return { ok: false, error: "Không ghi nhận lượt trả lời." };
  }
}

export async function voteHideAction(
  sessionId: string,
  questionId: string,
  input: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    await prisma.questionVote.upsert({
      where: {
        userId_questionId: {
          userId: auth.userId,
          questionId,
        },
      },
      create: {
        userId: auth.userId,
        questionId,
      },
      update: {},
    });

    const [voteCount, userCount] = await Promise.all([
      prisma.questionVote.count({ where: { questionId } }),
      prisma.user.count(),
    ]);

    if (shouldSoftDeleteQuestion(voteCount, userCount)) {
      await prisma.question.update({
        where: { id: questionId },
        data: { isDeleted: true },
      });
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    safeRevalidatePath(`/session/${sessionId}/history`);

    return { ok: true };
  } catch {
    return { ok: false, error: "Không ẩn được câu hỏi." };
  }
}

export async function setQuestionFiltersAction(
  sessionId: string,
  filters: {
    topicIds?: string[];
    questionTypes?: string[];
  },
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    const updateData: Prisma.GameSessionUpdateInput = {
      lastActiveAt: new Date(),
    };

    if (filters.topicIds !== undefined) {
      const cleaned = Array.from(new Set(filters.topicIds.filter(Boolean)));
      updateData.selectedTopicIds = cleaned.length > 0 ? cleaned : Prisma.DbNull;
    }

    if (filters.questionTypes !== undefined) {
      const validTypes = Object.values(QuestionType);
      const cleanedTypes = Array.from(
        new Set(
          filters.questionTypes.filter((t): t is QuestionType =>
            validTypes.includes(t as QuestionType),
          ),
        ),
      );
      updateData.selectedQuestionTypes =
        cleanedTypes.length > 0 && cleanedTypes.length < validTypes.length
          ? cleanedTypes
          : Prisma.DbNull;
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: updateData,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Không lưu được bộ lọc câu hỏi." };
  }
}

export async function setTopicFilterAction(
  sessionId: string,
  topicIds: string[],
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  return setQuestionFiltersAction(sessionId, { topicIds }, input);
}

export async function tagPlayerAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<
  | { ok: true; player: PlayPlayer; answeredPlayerIds: string[] }
  | ActionFail
> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    const player = await prisma.sessionPlayer.findFirst({
      where: { id: sessionPlayerId, sessionId },
      select: { id: true, displayName: true },
    });

    if (!player) {
      return { ok: false, error: "Không tìm thấy người chơi được mời." };
    }

    await prisma.sessionAnswer.upsert({
      where: {
        sessionId_sessionPlayerId_questionId: {
          sessionId,
          sessionPlayerId,
          questionId,
        },
      },
      create: {
        sessionId,
        sessionPlayerId,
        questionId,
      },
      update: {},
    });

    const [sessionAnswers] = await Promise.all([
      prisma.sessionAnswer.findMany({
        where: { sessionId, questionId },
        select: { sessionPlayerId: true },
      }),
      prisma.gameSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    const answeredPlayerIds = sessionAnswers.map((a) => a.sessionPlayerId);

    safeRevalidatePath(`/session/${sessionId}/history`);

    return { ok: true, player, answeredPlayerIds };
  } catch {
    return { ok: false, error: "Không thể mời người chơi này." };
  }
}

export async function discardCardAction(
  sessionId: string,
  sessionPlayerId: string,
  questionId: string,
  input?: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  try {
    await prisma.sessionAnswer.deleteMany({
      where: {
        sessionId,
        questionId,
      },
    });

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    safeRevalidatePath(`/session/${sessionId}/history`);

    return { ok: true };
  } catch {
    return { ok: false, error: "Không bỏ được thẻ này." };
  }
}

export async function addPlayerAction(
  sessionId: string,
  displayName: string,
  input?: DeviceInput,
): Promise<{ ok: true; players: PlayPlayer[] } | ActionFail> {
  const auth = await verifySessionAuthor(sessionId, input);
  if (!auth.ok) {
    return auth;
  }

  const normalized = normalizePlayerName(displayName);
  if (!normalized) {
    return { ok: false, error: "Nhập tên rồi mới thêm." };
  }

  if (normalized.length > PLAYER_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Tên tối đa ${PLAYER_NAME_MAX_LENGTH} ký tự.`,
    };
  }

  try {
    const existing = await prisma.sessionPlayer.findMany({
      where: { sessionId },
      select: { id: true, displayName: true },
      orderBy: { id: "asc" },
    });

    if (existing.some((p) => isSamePlayerName(p.displayName, normalized))) {
      return { ok: false, error: "Tên này đã có rồi." };
    }

    const created = await prisma.sessionPlayer.create({
      data: {
        sessionId,
        displayName: normalized,
      },
      select: { id: true, displayName: true },
    });

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    return {
      ok: true,
      players: [...existing, created],
    };
  } catch {
    return { ok: false, error: "Không thêm được người chơi." };
  }
}

