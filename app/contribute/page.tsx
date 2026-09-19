import { prisma } from "@/lib/db";
import { ContributeForm } from "@/components/session/contribute-form";

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ back?: string }>;
}) {
  const { back } = await searchParams;
  const topics = await prisma.topic.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ContributeForm backSessionId={back ?? null} topics={topics} />;
}
