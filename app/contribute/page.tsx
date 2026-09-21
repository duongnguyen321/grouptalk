import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ContributeForm } from "@/components/session/contribute-form";

export const metadata: Metadata = {
  title: "Đóng góp câu hỏi cộng đồng",
  description:
    "Đóng góp câu hỏi và thử thách thú vị vào kho câu hỏi chung của GroupTalk. Tên hoặc biệt danh của bạn sẽ xuất hiện trên mặt thẻ bài trước khi lật.",
  alternates: {
    canonical: "/contribute",
  },
  keywords: [
    "đóng góp câu hỏi",
    "tạo câu hỏi deeptalk",
    "cộng đồng grouptalk",
    "câu hỏi thật lòng",
    "thử thách nhóm",
  ],
};

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
