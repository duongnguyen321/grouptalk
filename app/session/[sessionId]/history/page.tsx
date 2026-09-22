import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SessionHistory } from "@/components/session/session-history";
import { prisma } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/identity";

export const metadata: Metadata = {
  title: "Lịch sử phiên chơi",
  description:
    "Xem lại danh sách các câu hỏi đã trả lời trong phiên chơi GroupTalk.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HistoryPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionHistoryPage({ params }: HistoryPageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, ownerUserId: true },
  });

  if (!session) {
    notFound();
  }

  const currentUser = await getCurrentUserOrNull();
  if (!currentUser || currentUser.id !== session.ownerUserId) {
    redirect("/session?unauthorized=1");
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
