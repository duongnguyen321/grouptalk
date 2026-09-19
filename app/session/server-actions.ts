"use server";

import type { Category } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RecentSessionEntry } from "@/lib/recent-sessions";

const SERVER_SESSION_LIMIT = 10;

export async function fetchMyGameSessions(): Promise<RecentSessionEntry[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const rows = await prisma.gameSession.findMany({
    where: { ownerUserId: session.user.id },
    select: {
      id: true,
      sessionCode: true,
      categories: true,
      createdAt: true,
    },
    orderBy: { lastActiveAt: "desc" },
    take: SERVER_SESSION_LIMIT,
  });

  return rows.map((row) => ({
    sessionId: row.id,
    sessionCode: row.sessionCode,
    categories: row.categories as Category[],
    createdAt: row.createdAt.toISOString(),
  }));
}
