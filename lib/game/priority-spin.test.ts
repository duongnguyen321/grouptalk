import { expect, test } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import { setPriorityAction, spinAction } from "@/app/session/[sessionId]/play/actions";
import { prisma } from "@/lib/db";
import { copySessionFromCode } from "@/lib/game/copy-session";
import { nextSessionCode } from "@/lib/session-code";

test("priority config persistence, weighted spin, and copy remapping", async () => {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  if (!dbConnected) {
    console.warn("Skipping priority-spin test: PostgreSQL is not reachable at DATABASE_URL");
    return;
  }

  // 1. Create a test user and session
  const user = await prisma.user.create({
    data: { authType: "DEVICE", deviceId: `test-device-${Date.now()}` },
  });

  const sessionCode = await nextSessionCode();
  const session = await prisma.gameSession.create({
    data: {
      sessionCode,
      ownerUserId: user.id,
      categories: [Category.FRIENDS],
      players: {
        create: [
          { displayName: "Player1" },
          { displayName: "Player2" },
          { displayName: "Player3" },
        ],
      },
    },
    include: { players: true },
  });

  const [p1, p2, p3] = session.players;
  expect(p1).toBeDefined();
  expect(p2).toBeDefined();
  expect(p3).toBeDefined();

  // 2. Test setPriorityAction with boost (p1: 5x, p2: 2x)
  const setResult = await setPriorityAction(session.id, {
    [p1.id]: 5,
    [p2.id]: 2,
    [p3.id]: 1,
  });
  expect(setResult.ok).toBe(true);

  // Verify in DB
  const updatedSession = await prisma.gameSession.findUnique({
    where: { id: session.id },
    select: { priorityConfig: true },
  });
  const config = updatedSession?.priorityConfig as {
    weights: Record<string, number>;
  };
  expect(config.weights[p1.id]).toBe(5);
  expect(config.weights[p2.id]).toBe(2);
  expect(config.weights[p3.id]).toBeUndefined(); // 1x is stripped / not boosted

  // 3. Test spinAction picks players respecting weights
  const spinCounts: Record<string, number> = { [p1.id]: 0, [p2.id]: 0, [p3.id]: 0 };
  for (let i = 0; i < 30; i++) {
    const spinResult = await spinAction(session.id);
    expect(spinResult.ok).toBe(true);
    if (spinResult.ok) {
      spinCounts[spinResult.player.id] = (spinCounts[spinResult.player.id] ?? 0) + 1;
    }
  }
  // With 5x weight vs 2x vs 1x, p1 should be picked the most
  expect(spinCounts[p1.id]).toBeGreaterThan(spinCounts[p3.id]);

  // 4. Test copySessionFromCode remaps priorityConfig
  const copyResult = await copySessionFromCode(session.sessionCode, user.id);
  expect(copyResult.ok).toBe(true);
  if (copyResult.ok) {
    const copiedSession = await prisma.gameSession.findUnique({
      where: { id: copyResult.sessionId },
      include: { players: true },
    });
    expect(copiedSession).not.toBeNull();
    const copiedConfig = copiedSession?.priorityConfig as {
      weights: Record<string, number>;
    };
    expect(copiedConfig).toBeDefined();
    expect(copiedConfig.weights).toBeDefined();

    // Map new players
    const newP1 = copiedSession?.players.find((p) => p.displayName === "Player1");
    const newP2 = copiedSession?.players.find((p) => p.displayName === "Player2");
    expect(newP1).toBeDefined();
    expect(newP2).toBeDefined();
    expect(copiedConfig.weights[newP1!.id]).toBe(5);
    expect(copiedConfig.weights[newP2!.id]).toBe(2);

    // Clean up copied session
    await prisma.gameSession.delete({ where: { id: copiedSession!.id } });
  }

  // 5. Test reset all to 1x sets priorityConfig to null
  const resetResult = await setPriorityAction(session.id, {
    [p1.id]: 1,
    [p2.id]: 1,
    [p3.id]: 1,
  });
  expect(resetResult.ok).toBe(true);
  const resetSession = await prisma.gameSession.findUnique({
    where: { id: session.id },
    select: { priorityConfig: true },
  });
  expect(resetSession?.priorityConfig).toBeNull();

  // Clean up
  await prisma.gameSession.delete({ where: { id: session.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
