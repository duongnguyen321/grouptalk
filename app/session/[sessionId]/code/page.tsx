import { notFound } from "next/navigation";
import { SessionCodeView } from "@/components/session/session-code-view";
import { prisma } from "@/lib/db";

type SessionCodePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionCodePage({ params }: SessionCodePageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, sessionCode: true },
  });

  if (!session) {
    notFound();
  }

  return (
    <SessionCodeView sessionId={session.id} sessionCode={session.sessionCode} />
  );
}
