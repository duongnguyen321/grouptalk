import { notFound } from "next/navigation";
import { PlayScreen } from "@/components/play/play-screen";
import { prisma } from "@/lib/db";

type PlayPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PlayPage({ params }: PlayPageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      sessionCode: true,
      categories: true,
      players: {
        select: { id: true, displayName: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!session || session.players.length === 0) {
    notFound();
  }

  return (
    <PlayScreen
      sessionId={session.id}
      sessionCode={session.sessionCode}
      categories={session.categories}
      players={session.players}
    />
  );
}
