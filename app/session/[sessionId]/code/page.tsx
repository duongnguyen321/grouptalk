import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SessionCodeView } from "@/components/session/session-code-view";
import { prisma } from "@/lib/db";
import { getCurrentUserOrNull } from "@/lib/identity";

export const metadata: Metadata = {
  title: "Mã phiên chơi",
  description:
    "Mã 8 số chia sẻ phiên chơi GroupTalk để copy sang thiết bị khác.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

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

