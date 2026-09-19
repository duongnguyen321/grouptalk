import { notFound, redirect } from "next/navigation";
import { SessionCodeView } from "@/components/session/session-code-view";
import { prisma } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/identity";

type SessionCodePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionCodePage({ params }: SessionCodePageProps) {
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, ownerUserId: true, sessionCode: true },
  });

  if (!session) {
    notFound();
  }

  const currentUser = await getCurrentUserOrNull();
  if (!currentUser || currentUser.id !== session.ownerUserId) {
    redirect("/session?unauthorized=1");
  }

  return (
    <SessionCodeView sessionId={session.id} sessionCode={session.sessionCode} />
  );
}

