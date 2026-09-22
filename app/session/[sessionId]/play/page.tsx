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

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlayPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { sessionId } = await params;
  const [session, allTopics] = await Promise.all([
    prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        ownerUserId: true,
        sessionCode: true,
        categories: true,
        priorityConfig: true,
        selectedTopicIds: true,
        selectedQuestionTypes: true,
        players: {
          select: { id: true, displayName: true },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.topic.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
  const initialSelectedTopicIds = Array.isArray(session.selectedTopicIds)
    ? (session.selectedTopicIds as string[])
    : [];
  const initialSelectedQuestionTypes = Array.isArray(
    session.selectedQuestionTypes,
  )
    ? (session.selectedQuestionTypes as import("@/generated/prisma/enums").QuestionType[])
    : [];

  return (
    <PlayScreen
      sessionId={session.id}
      sessionCode={session.sessionCode}
      categories={session.categories}
      players={session.players}
      initialWeights={initialWeights}
      allTopics={allTopics}
      initialSelectedTopicIds={initialSelectedTopicIds}
      initialSelectedQuestionTypes={initialSelectedQuestionTypes}
    />
  );
}
