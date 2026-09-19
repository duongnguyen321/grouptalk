import { notFound } from "next/navigation";
import { SessionHistory } from "@/components/session/session-history";
import { prisma } from "@/lib/db";

type HistoryPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionHistoryPage({ params }: HistoryPageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!session) {
    notFound();
  }

  const answers = await prisma.sessionAnswer.findMany({
    where: { sessionId },
    include: {
      question: { select: { title: true, isDeleted: true } },
      sessionPlayer: { select: { displayName: true } },
    },
    orderBy: { answeredAt: "asc" },
  });

  return (
    <SessionHistory
      sessionId={session.id}
      rows={answers.map((answer) => ({
        id: answer.id,
        playerName: answer.sessionPlayer.displayName,
        title: answer.question.title,
        isDeleted: answer.question.isDeleted,
      }))}
    />
  );
}
