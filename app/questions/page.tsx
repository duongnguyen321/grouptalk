import type { Metadata } from "next";
import { BackHeader } from "@/components/ui/back-header";
import { QuestionsExplorer } from "@/components/questions/questions-explorer";
import {
  fetchQuestionsBatch,
  getOverviewStats,
  getTopicsWithCounts,
} from "@/app/questions/actions";

export const metadata: Metadata = {
  title: "Kho câu hỏi & Thống kê | GroupTalk",
  description:
    "Khám phá danh sách câu hỏi đa dạng theo từng chủ đề trong trò chơi GroupTalk.",
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
