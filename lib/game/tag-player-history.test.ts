import { expect, test } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import {
  revealCardAction,
  tagPlayerAction,
} from "@/app/session/[sessionId]/play/actions";
import { prisma } from "@/lib/db";
import { pickThreeQuestions } from "@/lib/game/select-question";
import { nextSessionCode } from "@/lib/session-code";

test("tagPlayerAction records answer into history and pickThreeQuestions filters it out for subsequent draws", async () => {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  if (!dbConnected) {
    console.warn(
      "Skipping tag-player-history test: PostgreSQL is not reachable",
    );
    return;
  }

  const user = await prisma.user.create({
    data: { authType: "DEVICE", deviceId: `test-tag-device-${Date.now()}` },
  });

  const sessionCode = await nextSessionCode();
  const session = await prisma.gameSession.create({
    data: {
      sessionCode,
      ownerUserId: user.id,
      categories: [Category.FRIENDS],
      players: {
        create: [
          { displayName: "MemberA" },
          { displayName: "MemberB" },
          { displayName: "MemberC" },
        ],
      },
    },
    include: { players: true },
  });

  const [memberA, memberB, memberC] = session.players;
  expect(memberA).toBeDefined();
  expect(memberB).toBeDefined();
  expect(memberC).toBeDefined();

  const question = await prisma.question.findFirst({
    where: { isDeleted: false, categories: { has: Category.FRIENDS } },
  });
  expect(question).not.toBeNull();
  if (!question) return;

  // 1. MemberA reveals the card
  const revealRes = await revealCardAction(
    session.id,
    memberA.id,
    question.id,
    { deviceId: user.deviceId! },
  );
  expect(revealRes.ok).toBe(true);
  if (revealRes.ok) {
    expect(revealRes.answeredPlayerIds).toContain(memberA.id);
  }

  // 2. MemberA tags MemberB to answer together
  const tagRes = await tagPlayerAction(
    session.id,
    memberB.id,
    question.id,
    { deviceId: user.deviceId! },
  );
  expect(tagRes.ok).toBe(true);
  if (tagRes.ok) {
    expect(tagRes.answeredPlayerIds).toContain(memberA.id);
    expect(tagRes.answeredPlayerIds).toContain(memberB.id);
    expect(tagRes.player.displayName).toBe("MemberB");
  }

  // 3. Verify both answers exist in database history
  const historyAnswers = await prisma.sessionAnswer.findMany({
    where: { sessionId: session.id },
    include: { sessionPlayer: true, question: true },
    orderBy: { answeredAt: "asc" },
  });
  expect(historyAnswers.length).toBe(2);
  expect(historyAnswers[0].sessionPlayerId).toBe(memberA.id);
  expect(historyAnswers[0].questionId).toBe(question.id);
  expect(historyAnswers[1].sessionPlayerId).toBe(memberB.id);
  expect(historyAnswers[1].questionId).toBe(question.id);

  // 4. Verify pickThreeQuestions filters out the question for MemberB next time
  const memberBCards = await pickThreeQuestions(
    session.id,
    memberB.id,
    user.id,
  );
  expect(memberBCards.some((c) => c.id === question.id)).toBe(false);

  // 5. Verify pickThreeQuestions also filters out the question for MemberC
  const memberCCards = await pickThreeQuestions(
    session.id,
    memberC.id,
    user.id,
  );
  expect(memberCCards.some((c) => c.id === question.id)).toBe(false);

  // Clean up
  await prisma.gameSession.delete({ where: { id: session.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
