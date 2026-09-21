import type { Metadata } from "next";
import { BackHeader } from "@/components/ui/back-header";
import { QuestionsExplorer } from "@/components/questions/questions-explorer";
import {
  fetchQuestionsBatch,
  getOverviewStats,
  getTopicsWithCounts,
} from "@/app/questions/actions";

export const metadata: Metadata = {
  title: "Kho câu hỏi & Thống kê",
  description:
    "Khám phá hàng trăm câu hỏi đa dạng theo từng chủ đề: Thích thầm, Tình cảm, Kỷ niệm, Thử thách... trong trò chơi GroupTalk.",
  alternates: {
    canonical: "/questions",
  },
  keywords: [
    "kho câu hỏi deeptalk",
    "danh sách câu hỏi",
    "chủ đề câu hỏi",
    "thống kê câu hỏi grouptalk",
    "câu hỏi cặp đôi",
    "câu hỏi bạn bè",
  ],
};

export const dynamic = "force-dynamic";


export default async function QuestionsPage() {
  const [stats, topics, initialBatch] = await Promise.all([
    getOverviewStats(),
    getTopicsWithCounts(),
    fetchQuestionsBatch({ page: 0 }),
  ]);

  return (
    <main className="flex min-h-full flex-1 flex-col bg-canvas">
      <BackHeader backHref="/session" title="Kho câu hỏi" showHome={true} />
      <QuestionsExplorer
        initialItems={initialBatch.items}
        initialTotalCount={initialBatch.totalCount}
        initialHasMore={initialBatch.hasMore}
        topics={topics}
        stats={stats}
      />
    </main>
  );
}
