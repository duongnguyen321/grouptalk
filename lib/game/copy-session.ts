import { prisma } from "@/lib/db";
import { nextSessionCode } from "@/lib/session-code";

export async function copySessionFromCode(
  sessionCode: string,
  ownerUserId: string,
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const source = await prisma.gameSession.findUnique({
    where: { sessionCode },
    include: {
      players: { select: { id: true, displayName: true } },
      answers: {
        select: {
          sessionPlayerId: true,
          questionId: true,
          answeredAt: true,
        },
      },
    },
  });

  if (!source) {
    return { ok: false, error: "Mã phiên không tồn tại" };
  }

  const newCode = await nextSessionCode();

  try {
    const copied = await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.create({
        data: {
          sessionCode: newCode,
          ownerUserId,
          copiedFromSessionId: source.id,
          categories: source.categories,
          crushQuestionEnabled: source.crushQuestionEnabled,
        },
        select: { id: true },
      });

      const playerIdBySource = new Map<string, string>();

      for (const player of source.players) {
        const created = await tx.sessionPlayer.create({
          data: {
            sessionId: session.id,
            displayName: player.displayName,
          },
          select: { id: true },
        });
        playerIdBySource.set(player.id, created.id);
      }

      if (source.answers.length > 0) {
        await tx.sessionAnswer.createMany({
          data: source.answers.flatMap((answer) => {
            const sessionPlayerId = playerIdBySource.get(answer.sessionPlayerId);
            if (!sessionPlayerId) {
              return [];
            }

            return [
              {
                sessionId: session.id,
                sessionPlayerId,
                questionId: answer.questionId,
                answeredAt: answer.answeredAt,
              },
            ];
          }),
        });
      }

      return session;
    });

    return { ok: true, sessionId: copied.id };
  } catch {
    return { ok: false, error: "Không copy được phiên. Thử lại nhé." };
  }
}
