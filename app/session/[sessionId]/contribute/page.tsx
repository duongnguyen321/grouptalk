import { notFound } from "next/navigation";
import { ContributeForm } from "@/components/session/contribute-form";
import { prisma } from "@/lib/db";

type ContributePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ContributePage({ params }: ContributePageProps) {
  const { sessionId } = await params;
  const [session, topics] = await Promise.all([
    prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    }),
    prisma.topic.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!session) {
    notFound();
  }

  return <ContributeForm sessionId={session.id} topics={topics} />;
}
