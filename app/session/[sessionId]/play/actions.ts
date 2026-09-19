"use server";

import { Prisma } from "@/generated/prisma/client";
import { SPIN_BUSY_ERROR } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  pickWeightedRandom,
  shouldSoftDeleteQuestion,
} from "@/lib/game/eligibility";
import type { PlayPlayer, RevealedCard, TeaserCard } from "@/lib/game/play-types";
import { loadRevealedCard, pickThreeQuestions } from "@/lib/game/select-question";
import { getCurrentUser } from "@/lib/identity";
import { LockContentionError, withSessionLock } from "@/lib/redis-lock";

type ActionFail = { ok: false; error: string };
type DeviceInput = { deviceId?: string };

export async function setPriorityAction(
  sessionId: string,
  weights: Record<string, number>,
): Promise<{ ok: true } | ActionFail> {
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
): Promise<{ ok: true; player: PlayPlayer } | ActionFail> {
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
  try {
    const user = await getCurrentUser({ deviceId: input.deviceId });
    const cards = await pickThreeQuestions(
      sessionId,
      sessionPlayerId,
      user.id,
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
): Promise<{ ok: true; card: RevealedCard } | ActionFail> {
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

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    return { ok: true, card };
  } catch {
    return { ok: false, error: "Không ghi nhận lượt trả lời." };
  }
}

export async function voteHideAction(
  sessionId: string,
  questionId: string,
  input: DeviceInput,
): Promise<{ ok: true } | ActionFail> {
  try {
    const user = await getCurrentUser({ deviceId: input.deviceId });

    await prisma.questionVote.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId,
        },
      },
      create: {
        userId: user.id,
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

    return { ok: true };
  } catch {
    return { ok: false, error: "Không ẩn được câu hỏi." };
  }
}
