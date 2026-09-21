import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlayScreen } from "@/components/play/play-screen";
import { prisma } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/identity";

export const metadata: Metadata = {
  title: "Vòng quay & Câu hỏi",
  description:
    "Vòng quay ngẫu nhiên và rút 3 thẻ bài câu hỏi bí mật trong phiên chơi GroupTalk.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

type PlayPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      ownerUserId: true,
      sessionCode: true,
      categories: true,
      priorityConfig: true,
      players: {
        select: { id: true, displayName: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!session || session.players.length === 0) {
    notFound();
  }

  const currentUser = await getCurrentUserOrNull();
  if (!currentUser || currentUser.id !== session.ownerUserId) {
    redirect("/session?unauthorized=1");
  }

  const priorityConfig = session.priorityConfig as {
    weights?: Record<string, number>;
  } | null;
  const initialWeights = priorityConfig?.weights ?? {};

  return (
    <PlayScreen
      sessionId={session.id}
      sessionCode={session.sessionCode}
      categories={session.categories}
      players={session.players}
      initialWeights={initialWeights}
    />
  );
}
